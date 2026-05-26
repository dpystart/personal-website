package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

var scriptsDir string

type ScriptFile struct {
	Name       string `json:"name"`
	Category   string `json:"category"`
	Path       string `json:"path"`
	Size       int64  `json:"size"`
	ModifiedAt string `json:"modifiedAt"`
}

type ScriptListResponse struct {
	Categories []string     `json:"categories"`
	Scripts    []ScriptFile `json:"scripts"`
}

type ScriptContentResponse struct {
	Name       string `json:"name"`
	Category   string `json:"category"`
	Content    string `json:"content"`
	Size       int64  `json:"size"`
	ModifiedAt string `json:"modifiedAt"`
}

type CreateRequest struct {
	Filename string `json:"filename"`
	Content  string `json:"content"`
}

type UpdateRequest struct {
	Content     string `json:"content"`
	NewFilename string `json:"newFilename,omitempty"`
}

var categories = []string{"shell", "ansible"}

func isValidCategory(cat string) bool {
	for _, c := range categories {
		if c == cat {
			return true
		}
	}
	return false
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
	scripts := make([]ScriptFile, 0)

	for _, cat := range categories {
		dir := filepath.Join(scriptsDir, cat)
		entries, err := os.ReadDir(dir)
		if err != nil {
			log.Printf("ReadDir error for %s: %v", dir, err)
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			info, err := entry.Info()
			if err != nil {
				continue
			}
			scripts = append(scripts, ScriptFile{
				Name:       entry.Name(),
				Category:   cat,
				Path:       cat + "/" + entry.Name(),
				Size:       info.Size(),
				ModifiedAt: info.ModTime().Format(time.RFC3339),
			})
		}
	}

	sort.Slice(scripts, func(i, j int) bool {
		return scripts[i].ModifiedAt > scripts[j].ModifiedAt
	})

	jsonOK(w, ScriptListResponse{Categories: categories, Scripts: scripts})
}

// GET /api/scripts/{category}/{filename}
func handleGetFile(w http.ResponseWriter, r *http.Request, category, filename string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(scriptsDir, category, filename)
	info, err := os.Stat(filePath)
	if err != nil {
		jsonError(w, "文件不存在", http.StatusNotFound)
		return
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		jsonError(w, "读取文件失败", http.StatusInternalServerError)
		return
	}

	jsonOK(w, ScriptContentResponse{
		Name:       filename,
		Category:   category,
		Content:    string(content),
		Size:       info.Size(),
		ModifiedAt: info.ModTime().Format(time.RFC3339),
	})
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

	if req.Filename == "" {
		jsonError(w, "文件名不能为空", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(scriptsDir, category, req.Filename)
	if _, err := os.Stat(filePath); err == nil {
		jsonError(w, "文件已存在", http.StatusConflict)
		return
	}

	if err := os.WriteFile(filePath, []byte(req.Content), 0644); err != nil {
		jsonError(w, "创建失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	info, _ := os.Stat(filePath)
	w.WriteHeader(http.StatusCreated)
	jsonOK(w, ScriptFile{
		Name:       req.Filename,
		Category:   category,
		Path:       category + "/" + req.Filename,
		Size:       info.Size(),
		ModifiedAt: info.ModTime().Format(time.RFC3339),
	})
}

// PUT /api/scripts/{category}/{filename}
func handleUpdate(w http.ResponseWriter, r *http.Request, category, filename string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(scriptsDir, category, filename)
	if _, err := os.Stat(filePath); err != nil {
		jsonError(w, "文件不存在", http.StatusNotFound)
		return
	}

	body, _ := io.ReadAll(r.Body)
	var req UpdateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	targetPath := filePath
	targetName := filename
	if req.NewFilename != "" && req.NewFilename != filename {
		targetPath = filepath.Join(scriptsDir, category, req.NewFilename)
		if err := os.Rename(filePath, targetPath); err != nil {
			jsonError(w, "重命名失败", http.StatusInternalServerError)
			return
		}
		targetName = req.NewFilename
	}

	if err := os.WriteFile(targetPath, []byte(req.Content), 0644); err != nil {
		jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	info, _ := os.Stat(targetPath)
	jsonOK(w, ScriptFile{
		Name:       targetName,
		Category:   category,
		Path:       category + "/" + targetName,
		Size:       info.Size(),
		ModifiedAt: info.ModTime().Format(time.RFC3339),
	})
}

// DELETE /api/scripts/{category}/{filename}
func handleDelete(w http.ResponseWriter, r *http.Request, category, filename string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(scriptsDir, category, filename)
	if _, err := os.Stat(filePath); err != nil {
		jsonError(w, "文件不存在", http.StatusNotFound)
		return
	}

	if err := os.Remove(filePath); err != nil {
		jsonError(w, "删除失败", http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]bool{"success": true})
}

func scriptsHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/scripts")
	path = strings.TrimPrefix(path, "/")
	parts := strings.SplitN(path, "/", 2)

	switch {
	case path == "" || path == "/":
		if r.Method == "GET" {
			handleList(w, r)
		} else {
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	case len(parts) == 1:
		category := parts[0]
		if r.Method == "POST" {
			handleCreate(w, r, category)
		} else {
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	case len(parts) == 2:
		category := parts[0]
		filename := parts[1]
		switch r.Method {
		case "GET":
			handleGetFile(w, r, category, filename)
		case "PUT":
			handleUpdate(w, r, category, filename)
		case "DELETE":
			handleDelete(w, r, category, filename)
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

	// 确保目录存在
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
