package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var scriptsDir string

type TreeNode struct {
	Key         string     `json:"key"`
	Title       string     `json:"title"`
	IsLeaf      bool       `json:"isLeaf"`
	Children    []TreeNode `json:"children,omitempty"`
	Size        *int64     `json:"size,omitempty"`
	ModifiedAt  *string    `json:"modifiedAt,omitempty"`
	Description *string    `json:"description,omitempty"`
}

type TreeResponse struct {
	Categories []string              `json:"categories"`
	Trees      map[string][]TreeNode `json:"trees"`
}

type ScriptContentResponse struct {
	Name       string `json:"name"`
	Category   string `json:"category"`
	Content    string `json:"content"`
	Size       int64  `json:"size"`
	ModifiedAt string `json:"modifiedAt"`
}

type CreateRequest struct {
	Filepath string `json:"filepath"`
	Filename string `json:"filename"`
	Content  string `json:"content"`
}

type MkdirRequest struct {
	Dirpath string `json:"dirpath"`
}

var categories = []string{"shell", "ansible", "python"}

func isValidCategory(cat string) bool {
	for _, c := range categories {
		if c == cat {
			return true
		}
	}
	return false
}

func safePath(category, relativePath string) (string, bool) {
	resolved, err := filepath.Abs(filepath.Join(scriptsDir, category, relativePath))
	if err != nil {
		return "", false
	}
	categoryRoot, _ := filepath.Abs(filepath.Join(scriptsDir, category))
	if resolved != categoryRoot && !strings.HasPrefix(resolved, categoryRoot+string(filepath.Separator)) {
		return "", false
	}
	return resolved, true
}

func extractDescription(filePath string) string {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return ""
	}
	lines := strings.Split(string(content), "\n")
	var descLines []string
	for i := 0; i < len(lines) && i < 10; i++ {
		line := strings.TrimSpace(lines[i])
		if i == 0 && strings.HasPrefix(line, "#!") {
			continue
		}
		if len(descLines) == 0 && line == "" {
			continue
		}
		if strings.HasPrefix(line, "#") || strings.HasPrefix(line, "//") {
			cleaned := strings.TrimLeft(line, "#/ ")
			descLines = append(descLines, cleaned)
		} else if line == "---" {
			continue
		} else if strings.HasPrefix(line, "- name:") {
			cleaned := strings.TrimPrefix(line, "- name:")
			descLines = append(descLines, strings.TrimSpace(cleaned))
			break
		} else {
			break
		}
	}
	return strings.TrimSpace(strings.Join(descLines, " "))
}

func scanDirectory(dirPath, relativePath string) []TreeNode {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil
	}

	var dirs []os.DirEntry
	var files []os.DirEntry
	for _, e := range entries {
		if e.IsDir() {
			dirs = append(dirs, e)
		} else {
			files = append(files, e)
		}
	}

	var nodes []TreeNode

	for _, d := range dirs {
		relPath := d.Name()
		if relativePath != "" {
			relPath = relativePath + "/" + d.Name()
		}
		children := scanDirectory(filepath.Join(dirPath, d.Name()), relPath)
		nodes = append(nodes, TreeNode{
			Key:      relPath,
			Title:    d.Name(),
			IsLeaf:   false,
			Children: children,
		})
	}

	for _, f := range files {
		relPath := f.Name()
		if relativePath != "" {
			relPath = relativePath + "/" + f.Name()
		}
		fullPath := filepath.Join(dirPath, f.Name())
		info, err := f.Info()
		if err != nil {
			continue
		}
		size := info.Size()
		modTime := info.ModTime().Format(time.RFC3339)
		desc := extractDescription(fullPath)

		node := TreeNode{
			Key:        relPath,
			Title:      f.Name(),
			IsLeaf:     true,
			Size:       &size,
			ModifiedAt: &modTime,
		}
		if desc != "" {
			node.Description = &desc
		}
		nodes = append(nodes, node)
	}

	if nodes == nil {
		nodes = []TreeNode{}
	}
	return nodes
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func jsonOK(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// GET /api/scripts
func handleList(w http.ResponseWriter, r *http.Request) {
	trees := make(map[string][]TreeNode)
	for _, cat := range categories {
		dir := filepath.Join(scriptsDir, cat)
		trees[cat] = scanDirectory(dir, "")
	}
	jsonOK(w, TreeResponse{Categories: categories, Trees: trees})
}

// GET /api/scripts/{category}/{filepath...}
func handleGetFile(w http.ResponseWriter, r *http.Request, category, filePath string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}
	resolved, ok := safePath(category, filePath)
	if !ok {
		jsonError(w, "无效的路径", http.StatusBadRequest)
		return
	}
	info, err := os.Stat(resolved)
	if err != nil || info.IsDir() {
		jsonError(w, "文件不存在", http.StatusNotFound)
		return
	}
	content, err := os.ReadFile(resolved)
	if err != nil {
		jsonError(w, "读取文件失败", http.StatusInternalServerError)
		return
	}
	jsonOK(w, ScriptContentResponse{
		Name:       filepath.Base(filePath),
		Category:   category,
		Content:    string(content),
		Size:       info.Size(),
		ModifiedAt: info.ModTime().Format(time.RFC3339),
	})
}

// POST /api/scripts/{category}/mkdir
func handleMkdir(w http.ResponseWriter, r *http.Request, category string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}
	body, _ := io.ReadAll(r.Body)
	var req MkdirRequest
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}
	if req.Dirpath == "" {
		jsonError(w, "目录路径不能为空", http.StatusBadRequest)
		return
	}
	resolved, ok := safePath(category, req.Dirpath)
	if !ok {
		jsonError(w, "无效的路径", http.StatusBadRequest)
		return
	}
	if _, err := os.Stat(resolved); err == nil {
		jsonError(w, "目录已存在", http.StatusConflict)
		return
	}
	if err := os.MkdirAll(resolved, 0755); err != nil {
		jsonError(w, "创建失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	jsonOK(w, map[string]interface{}{"success": true, "path": req.Dirpath})
}

// POST /api/scripts/{category}
func handleCreate(w http.ResponseWriter, r *http.Request, category string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}
	body, _ := io.ReadAll(r.Body)
	var req CreateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}
	filePath := req.Filepath
	if filePath == "" {
		filePath = req.Filename
	}
	if filePath == "" {
		jsonError(w, "文件路径不能为空", http.StatusBadRequest)
		return
	}
	resolved, ok := safePath(category, filePath)
	if !ok {
		jsonError(w, "无效的路径", http.StatusBadRequest)
		return
	}
	if _, err := os.Stat(resolved); err == nil {
		jsonError(w, "文件已存在", http.StatusConflict)
		return
	}
	parentDir := filepath.Dir(resolved)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		jsonError(w, "创建目录失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(resolved, []byte(req.Content), 0644); err != nil {
		jsonError(w, "创建失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	info, _ := os.Stat(resolved)
	w.WriteHeader(http.StatusCreated)
	jsonOK(w, map[string]interface{}{
		"name":       filepath.Base(filePath),
		"category":   category,
		"size":       info.Size(),
		"modifiedAt": info.ModTime().Format(time.RFC3339),
	})
}

// DELETE /api/scripts/{category}/{filepath...}
func handleDelete(w http.ResponseWriter, r *http.Request, category, filePath string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}
	resolved, ok := safePath(category, filePath)
	if !ok {
		jsonError(w, "无效的路径", http.StatusBadRequest)
		return
	}
	info, err := os.Stat(resolved)
	if err != nil {
		jsonError(w, "文件不存在", http.StatusNotFound)
		return
	}
	if info.IsDir() {
		if err := os.RemoveAll(resolved); err != nil {
			jsonError(w, "删除失败", http.StatusInternalServerError)
			return
		}
	} else {
		if err := os.Remove(resolved); err != nil {
			jsonError(w, "删除失败", http.StatusInternalServerError)
			return
		}
	}
	jsonOK(w, map[string]bool{"success": true})
}

func scriptsHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/scripts")
	path = strings.TrimPrefix(path, "/")

	switch {
	case path == "" || path == "/":
		if r.Method == "GET" {
			handleList(w, r)
		} else {
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	default:
		parts := strings.SplitN(path, "/", 2)
		category := parts[0]

		if len(parts) == 1 {
			if r.Method == "POST" {
				handleCreate(w, r, category)
			} else {
				jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		rest := parts[1]

		// POST /{category}/mkdir
		if rest == "mkdir" && r.Method == "POST" {
			handleMkdir(w, r, category)
			return
		}

		switch r.Method {
		case "GET":
			handleGetFile(w, r, category, rest)
		case "DELETE":
			handleDelete(w, r, category, rest)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func main() {
	scriptsDir = os.Getenv("SCRIPTS_DIR")
	if scriptsDir == "" {
		scriptsDir = "/root/mydata/scripts"
	}

	for _, cat := range categories {
		os.MkdirAll(filepath.Join(scriptsDir, cat), 0755)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	http.HandleFunc("/api/scripts", corsMiddleware(scriptsHandler))
	http.HandleFunc("/api/scripts/", corsMiddleware(scriptsHandler))

	fmt.Printf("Backend running on :%s\n", port)
	fmt.Printf("Scripts directory: %s\n", scriptsDir)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
