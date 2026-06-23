package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var scriptsDir string
var tasksDir string
var commandsDir string

// ==================== Scripts Models ====================

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

// ==================== Tasks Models ====================

type Task struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Category    string   `json:"category"`
	Status      string   `json:"status"`
	Priority    string   `json:"priority"`
	DueDate     string   `json:"dueDate,omitempty"`
	Progress    int      `json:"progress"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	TodayFocus  bool     `json:"todayFocus"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
	CompletedAt string   `json:"completedAt,omitempty"`
}

type WorkLog struct {
	ID        string `json:"id"`
	TaskID    string `json:"taskId,omitempty"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}

type SavedReport struct {
	ID         string `json:"id"`
	Scope      string `json:"scope"`
	RangeStart string `json:"rangeStart"`
	RangeEnd   string `json:"rangeEnd"`
	Markdown   string `json:"markdown"`
	CreatedAt  string `json:"createdAt"`
}

// ==================== Commands Models ====================

type Command struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	CommandText string   `json:"command"`
	Description string   `json:"description,omitempty"`
	Category    string   `json:"category"`
	Tags        []string `json:"tags"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

// ==================== Scripts Code ====================

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

// POST /api/scripts/{category}/rename
func handleRename(w http.ResponseWriter, r *http.Request, category string) {
	if !isValidCategory(category) {
		jsonError(w, "无效的分类", http.StatusBadRequest)
		return
	}
	body, _ := io.ReadAll(r.Body)
	var req struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	if err := json.Unmarshal(body, &req); err != nil || req.OldPath == "" || req.NewPath == "" {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}
	oldResolved, ok := safePath(category, req.OldPath)
	if !ok {
		jsonError(w, "无效的路径", http.StatusBadRequest)
		return
	}
	newResolved, ok := safePath(category, req.NewPath)
	if !ok {
		jsonError(w, "无效的目标路径", http.StatusBadRequest)
		return
	}
	if _, err := os.Stat(oldResolved); err != nil {
		jsonError(w, "源文件不存在", http.StatusNotFound)
		return
	}
	if _, err := os.Stat(newResolved); err == nil {
		jsonError(w, "目标文件已存在", http.StatusConflict)
		return
	}
	parentDir := filepath.Dir(newResolved)
	os.MkdirAll(parentDir, 0755)
	if err := os.Rename(oldResolved, newResolved); err != nil {
		jsonError(w, "重命名失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]interface{}{"success": true, "newPath": req.NewPath})
}

// PUT /api/scripts/{category}/{filepath...}
func handleUpdateFile(w http.ResponseWriter, r *http.Request, category, filePath string) {
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
	body, _ := io.ReadAll(r.Body)
	var req struct {
		Content string `json:"content"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}
	if err := os.WriteFile(resolved, []byte(req.Content), 0644); err != nil {
		jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	info, _ = os.Stat(resolved)
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

		// POST /{category}/rename
		if rest == "rename" && r.Method == "POST" {
			handleRename(w, r, category)
			return
		}

		switch r.Method {
		case "GET":
			handleGetFile(w, r, category, rest)
		case "PUT":
			handleUpdateFile(w, r, category, rest)
		case "DELETE":
			handleDelete(w, r, category, rest)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// ==================== Tasks Helper Functions ====================

func generateID() string {
	return fmt.Sprintf("%d%04d", time.Now().UnixMilli(), rand.Intn(10000))
}

func getMonthlyFileName(prefix string, t time.Time) string {
	return fmt.Sprintf("%s-%s.json", prefix, t.Format("2006-01"))
}

func readTasksFile(path string) []Task {
	data, err := os.ReadFile(path)
	if err != nil {
		return []Task{}
	}
	var tasks []Task
	if err := json.Unmarshal(data, &tasks); err != nil {
		return []Task{}
	}
	return tasks
}

func writeTasksFile(path string, tasks []Task) error {
	data, err := json.MarshalIndent(tasks, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func readLogsFile(path string) []WorkLog {
	data, err := os.ReadFile(path)
	if err != nil {
		return []WorkLog{}
	}
	var logs []WorkLog
	if err := json.Unmarshal(data, &logs); err != nil {
		return []WorkLog{}
	}
	return logs
}

func writeLogsFile(path string, logs []WorkLog) error {
	data, err := json.MarshalIndent(logs, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func readReportsFile(path string) []SavedReport {
	data, err := os.ReadFile(path)
	if err != nil {
		return []SavedReport{}
	}
	var reports []SavedReport
	if err := json.Unmarshal(data, &reports); err != nil {
		return []SavedReport{}
	}
	return reports
}

func writeReportsFile(path string, reports []SavedReport) error {
	data, err := json.MarshalIndent(reports, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func getMonthRange(from, to string) []time.Time {
	now := time.Now()
	var start, end time.Time

	if from != "" {
		parsed, err := time.Parse("2006-01-02", from)
		if err == nil {
			start = parsed
		} else {
			start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
		}
	} else {
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
	}

	if to != "" {
		parsed, err := time.Parse("2006-01-02", to)
		if err == nil {
			end = parsed
		} else {
			end = now
		}
	} else {
		end = now
	}

	var months []time.Time
	current := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.Local)
	endMonth := time.Date(end.Year(), end.Month(), 1, 0, 0, 0, 0, time.Local)

	for !current.After(endMonth) {
		months = append(months, current)
		current = current.AddDate(0, 1, 0)
	}

	return months
}

// ==================== Tasks Handlers ====================

// GET /api/tasks
func handleGetTasks(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	status := r.URL.Query().Get("status")
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	months := getMonthRange(from, to)

	var allTasks []Task
	for _, month := range months {
		fileName := getMonthlyFileName("tasks", month)
		filePath := filepath.Join(tasksDir, fileName)
		tasks := readTasksFile(filePath)
		allTasks = append(allTasks, tasks...)
	}

	// Apply filters
	var filtered []Task
	for _, task := range allTasks {
		if category != "" && task.Category != category {
			continue
		}
		if status != "" && task.Status != status {
			continue
		}
		filtered = append(filtered, task)
	}

	if filtered == nil {
		filtered = []Task{}
	}

	jsonOK(w, map[string]interface{}{"tasks": filtered})
}

// POST /api/tasks
func handleCreateTask(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	var task Task
	if err := json.Unmarshal(body, &task); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	now := time.Now()
	task.ID = generateID()
	task.CreatedAt = now.Format(time.RFC3339)
	task.UpdatedAt = now.Format(time.RFC3339)

	if task.Status == "" {
		task.Status = "pending"
	}
	if task.Tags == nil {
		task.Tags = []string{}
	}

	fileName := getMonthlyFileName("tasks", now)
	filePath := filepath.Join(tasksDir, fileName)
	tasks := readTasksFile(filePath)
	tasks = append(tasks, task)

	if err := writeTasksFile(filePath, tasks); err != nil {
		jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	jsonOK(w, task)
}

// PUT /api/tasks/{id}
func handleUpdateTask(w http.ResponseWriter, r *http.Request, id string) {
	body, _ := io.ReadAll(r.Body)
	var updates map[string]interface{}
	if err := json.Unmarshal(body, &updates); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	// Try to find the task, check current month first
	now := time.Now()
	currentMonthFile := getMonthlyFileName("tasks", now)
	currentMonthPath := filepath.Join(tasksDir, currentMonthFile)

	// Try current month first
	found := false
	var foundPath string

	tasks := readTasksFile(currentMonthPath)
	for i, t := range tasks {
		if t.ID == id {
			tasks[i] = applyTaskUpdates(tasks[i], updates)
			if err := writeTasksFile(currentMonthPath, tasks); err != nil {
				jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, tasks[i])
			return
		}
	}

	// Scan other monthly files
	entries, err := os.ReadDir(tasksDir)
	if err != nil {
		jsonError(w, "任务不存在", http.StatusNotFound)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), "tasks-") || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		if entry.Name() == currentMonthFile {
			continue // Already checked
		}
		foundPath = filepath.Join(tasksDir, entry.Name())
		tasks = readTasksFile(foundPath)
		for i, t := range tasks {
			if t.ID == id {
				tasks[i] = applyTaskUpdates(tasks[i], updates)
				if err := writeTasksFile(foundPath, tasks); err != nil {
					jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
					return
				}
				jsonOK(w, tasks[i])
				found = true
				return
			}
		}
	}

	if !found {
		jsonError(w, "任务不存在", http.StatusNotFound)
	}
}

func applyTaskUpdates(task Task, updates map[string]interface{}) Task {
	if v, ok := updates["title"].(string); ok {
		task.Title = v
	}
	if v, ok := updates["category"].(string); ok {
		task.Category = v
	}
	if v, ok := updates["status"].(string); ok {
		if v == "completed" && task.Status != "completed" {
			task.CompletedAt = time.Now().Format(time.RFC3339)
		}
		task.Status = v
	}
	if v, ok := updates["priority"].(string); ok {
		task.Priority = v
	}
	if v, ok := updates["dueDate"].(string); ok {
		task.DueDate = v
	}
	if v, ok := updates["progress"].(float64); ok {
		task.Progress = int(v)
	}
	if v, ok := updates["description"].(string); ok {
		task.Description = v
	}
	if v, ok := updates["tags"].([]interface{}); ok {
		tags := make([]string, 0, len(v))
		for _, t := range v {
			if s, ok := t.(string); ok {
				tags = append(tags, s)
			}
		}
		task.Tags = tags
	}
	if v, ok := updates["todayFocus"].(bool); ok {
		task.TodayFocus = v
	}
	task.UpdatedAt = time.Now().Format(time.RFC3339)
	return task
}

// DELETE /api/tasks/{id}
func handleDeleteTask(w http.ResponseWriter, r *http.Request, id string) {
	// Try current month first
	now := time.Now()
	currentMonthFile := getMonthlyFileName("tasks", now)
	currentMonthPath := filepath.Join(tasksDir, currentMonthFile)

	tasks := readTasksFile(currentMonthPath)
	for i, t := range tasks {
		if t.ID == id {
			tasks = append(tasks[:i], tasks[i+1:]...)
			if err := writeTasksFile(currentMonthPath, tasks); err != nil {
				jsonError(w, "删除失败: "+err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, map[string]bool{"success": true})
			return
		}
	}

	// Scan other monthly files
	entries, err := os.ReadDir(tasksDir)
	if err != nil {
		jsonError(w, "任务不存在", http.StatusNotFound)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), "tasks-") || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		if entry.Name() == currentMonthFile {
			continue
		}
		filePath := filepath.Join(tasksDir, entry.Name())
		tasks = readTasksFile(filePath)
		for i, t := range tasks {
			if t.ID == id {
				tasks = append(tasks[:i], tasks[i+1:]...)
				if err := writeTasksFile(filePath, tasks); err != nil {
					jsonError(w, "删除失败: "+err.Error(), http.StatusInternalServerError)
					return
				}
				jsonOK(w, map[string]bool{"success": true})
				return
			}
		}
	}

	jsonError(w, "任务不存在", http.StatusNotFound)
}

// GET /api/tasks/logs
func handleGetLogs(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	months := getMonthRange(from, to)

	var allLogs []WorkLog
	for _, month := range months {
		fileName := getMonthlyFileName("logs", month)
		filePath := filepath.Join(tasksDir, fileName)
		logs := readLogsFile(filePath)
		allLogs = append(allLogs, logs...)
	}

	if allLogs == nil {
		allLogs = []WorkLog{}
	}

	jsonOK(w, map[string]interface{}{"logs": allLogs})
}

// POST /api/tasks/logs
func handleCreateLog(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	var logEntry WorkLog
	if err := json.Unmarshal(body, &logEntry); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	now := time.Now()
	logEntry.ID = generateID()
	logEntry.CreatedAt = now.Format(time.RFC3339)

	fileName := getMonthlyFileName("logs", now)
	filePath := filepath.Join(tasksDir, fileName)
	logs := readLogsFile(filePath)
	logs = append(logs, logEntry)

	if err := writeLogsFile(filePath, logs); err != nil {
		jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	jsonOK(w, logEntry)
}

// DELETE /api/tasks/logs/{id}
func handleDeleteLog(w http.ResponseWriter, r *http.Request, id string) {
	// Try current month first
	now := time.Now()
	currentMonthFile := getMonthlyFileName("logs", now)
	currentMonthPath := filepath.Join(tasksDir, currentMonthFile)

	logs := readLogsFile(currentMonthPath)
	for i, l := range logs {
		if l.ID == id {
			logs = append(logs[:i], logs[i+1:]...)
			if err := writeLogsFile(currentMonthPath, logs); err != nil {
				jsonError(w, "删除失败: "+err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, map[string]bool{"success": true})
			return
		}
	}

	// Scan other monthly files
	entries, err := os.ReadDir(tasksDir)
	if err != nil {
		jsonError(w, "日志不存在", http.StatusNotFound)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), "logs-") || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		if entry.Name() == currentMonthFile {
			continue
		}
		filePath := filepath.Join(tasksDir, entry.Name())
		logs = readLogsFile(filePath)
		for i, l := range logs {
			if l.ID == id {
				logs = append(logs[:i], logs[i+1:]...)
				if err := writeLogsFile(filePath, logs); err != nil {
					jsonError(w, "删除失败: "+err.Error(), http.StatusInternalServerError)
					return
				}
				jsonOK(w, map[string]bool{"success": true})
				return
			}
		}
	}

	jsonError(w, "日志不存在", http.StatusNotFound)
}

// GET /api/tasks/reports
func handleGetReports(w http.ResponseWriter, r *http.Request) {
	filePath := filepath.Join(tasksDir, "reports.json")
	reports := readReportsFile(filePath)
	jsonOK(w, map[string]interface{}{"reports": reports})
}

// POST /api/tasks/reports
func handleCreateReport(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	var report SavedReport
	if err := json.Unmarshal(body, &report); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	report.ID = generateID()
	report.CreatedAt = time.Now().Format(time.RFC3339)

	filePath := filepath.Join(tasksDir, "reports.json")
	reports := readReportsFile(filePath)
	reports = append(reports, report)

	if err := writeReportsFile(filePath, reports); err != nil {
		jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	jsonOK(w, report)
}

// DELETE /api/tasks/reports/{id}
func handleDeleteReport(w http.ResponseWriter, r *http.Request, id string) {
	filePath := filepath.Join(tasksDir, "reports.json")
	reports := readReportsFile(filePath)

	for i, rpt := range reports {
		if rpt.ID == id {
			reports = append(reports[:i], reports[i+1:]...)
			if err := writeReportsFile(filePath, reports); err != nil {
				jsonError(w, "删除失败: "+err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, map[string]bool{"success": true})
			return
		}
	}

	jsonError(w, "报告不存在", http.StatusNotFound)
}

// ==================== Tasks Router ====================

func tasksHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/tasks")
	path = strings.TrimPrefix(path, "/")

	switch {
	// /api/tasks/logs/{id}
	case strings.HasPrefix(path, "logs/") && path != "logs/":
		id := strings.TrimPrefix(path, "logs/")
		if r.Method == "DELETE" {
			handleDeleteLog(w, r, id)
		} else {
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	// /api/tasks/logs
	case path == "logs":
		switch r.Method {
		case "GET":
			handleGetLogs(w, r)
		case "POST":
			handleCreateLog(w, r)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	// /api/tasks/reports/{id}
	case strings.HasPrefix(path, "reports/") && path != "reports/":
		id := strings.TrimPrefix(path, "reports/")
		if r.Method == "DELETE" {
			handleDeleteReport(w, r, id)
		} else {
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	// /api/tasks/reports
	case path == "reports":
		switch r.Method {
		case "GET":
			handleGetReports(w, r)
		case "POST":
			handleCreateReport(w, r)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	// /api/tasks/{id} (PUT/DELETE a specific task)
	case path != "" && path != "/":
		switch r.Method {
		case "PUT":
			handleUpdateTask(w, r, path)
		case "DELETE":
			handleDeleteTask(w, r, path)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	// /api/tasks (GET all tasks, POST create task)
	default:
		switch r.Method {
		case "GET":
			handleGetTasks(w, r)
		case "POST":
			handleCreateTask(w, r)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// ==================== Commands Helper Functions ====================

func readCommandsFile() []Command {
	data, err := os.ReadFile(filepath.Join(commandsDir, "commands.json"))
	if err != nil {
		return []Command{}
	}
	var commands []Command
	if err := json.Unmarshal(data, &commands); err != nil {
		return []Command{}
	}
	return commands
}

func writeCommandsFile(commands []Command) error {
	data, err := json.MarshalIndent(commands, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(commandsDir, "commands.json"), data, 0644)
}

func applyCommandUpdates(cmd Command, updates map[string]interface{}) Command {
	if v, ok := updates["title"].(string); ok {
		cmd.Title = v
	}
	if v, ok := updates["command"].(string); ok {
		cmd.CommandText = v
	}
	if v, ok := updates["description"].(string); ok {
		cmd.Description = v
	}
	if v, ok := updates["category"].(string); ok {
		cmd.Category = v
	}
	if v, ok := updates["tags"].([]interface{}); ok {
		tags := make([]string, 0, len(v))
		for _, t := range v {
			if s, ok := t.(string); ok {
				tags = append(tags, s)
			}
		}
		cmd.Tags = tags
	}
	cmd.UpdatedAt = time.Now().Format(time.RFC3339)
	return cmd
}

// ==================== Commands Handlers ====================

// GET /api/commands
func handleGetCommands(w http.ResponseWriter, r *http.Request) {
	q := strings.ToLower(r.URL.Query().Get("q"))
	category := r.URL.Query().Get("category")

	commands := readCommandsFile()

	var filtered []Command
	for _, cmd := range commands {
		if category != "" && cmd.Category != category {
			continue
		}
		if q != "" {
			match := strings.Contains(strings.ToLower(cmd.Title), q) ||
				strings.Contains(strings.ToLower(cmd.CommandText), q) ||
				strings.Contains(strings.ToLower(cmd.Description), q)
			if !match {
				for _, tag := range cmd.Tags {
					if strings.Contains(strings.ToLower(tag), q) {
						match = true
						break
					}
				}
			}
			if !match {
				continue
			}
		}
		filtered = append(filtered, cmd)
	}

	if filtered == nil {
		filtered = []Command{}
	}

	jsonOK(w, map[string]interface{}{"commands": filtered})
}

// POST /api/commands
func handleCreateCommand(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	var cmd Command
	if err := json.Unmarshal(body, &cmd); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	now := time.Now()
	cmd.ID = generateID()
	cmd.CreatedAt = now.Format(time.RFC3339)
	cmd.UpdatedAt = now.Format(time.RFC3339)

	if cmd.Tags == nil {
		cmd.Tags = []string{}
	}

	commands := readCommandsFile()
	commands = append(commands, cmd)

	if err := writeCommandsFile(commands); err != nil {
		jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	jsonOK(w, cmd)
}

// PUT /api/commands/{id}
func handleUpdateCommand(w http.ResponseWriter, r *http.Request, id string) {
	body, _ := io.ReadAll(r.Body)
	var updates map[string]interface{}
	if err := json.Unmarshal(body, &updates); err != nil {
		jsonError(w, "请求格式错误", http.StatusBadRequest)
		return
	}

	commands := readCommandsFile()
	for i, cmd := range commands {
		if cmd.ID == id {
			commands[i] = applyCommandUpdates(commands[i], updates)
			if err := writeCommandsFile(commands); err != nil {
				jsonError(w, "保存失败: "+err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, commands[i])
			return
		}
	}

	jsonError(w, "命令不存在", http.StatusNotFound)
}

// DELETE /api/commands/{id}
func handleDeleteCommand(w http.ResponseWriter, r *http.Request, id string) {
	commands := readCommandsFile()
	for i, cmd := range commands {
		if cmd.ID == id {
			commands = append(commands[:i], commands[i+1:]...)
			if err := writeCommandsFile(commands); err != nil {
				jsonError(w, "删除失败: "+err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, map[string]bool{"success": true})
			return
		}
	}

	jsonError(w, "命令不存在", http.StatusNotFound)
}

// ==================== Commands Router ====================

func commandsHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/commands")
	path = strings.TrimPrefix(path, "/")

	switch {
	// /api/commands/{id}
	case path != "" && path != "/":
		switch r.Method {
		case "PUT":
			handleUpdateCommand(w, r, path)
		case "DELETE":
			handleDeleteCommand(w, r, path)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}

	// /api/commands
	default:
		switch r.Method {
		case "GET":
			handleGetCommands(w, r)
		case "POST":
			handleCreateCommand(w, r)
		default:
			jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// ==================== Main ====================

func main() {
	scriptsDir = os.Getenv("SCRIPTS_DIR")
	if scriptsDir == "" {
		scriptsDir = "/root/mydata/scripts"
	}

	tasksDir = os.Getenv("TASKS_DIR")
	if tasksDir == "" {
		tasksDir = "/mydata/tasks"
	}

	commandsDir = os.Getenv("COMMANDS_DIR")
	if commandsDir == "" {
		commandsDir = "/mydata/commands"
	}

	for _, cat := range categories {
		os.MkdirAll(filepath.Join(scriptsDir, cat), 0755)
	}

	os.MkdirAll(tasksDir, 0755)
	os.MkdirAll(commandsDir, 0755)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	http.HandleFunc("/api/scripts", corsMiddleware(scriptsHandler))
	http.HandleFunc("/api/scripts/", corsMiddleware(scriptsHandler))
	http.HandleFunc("/api/tasks", corsMiddleware(tasksHandler))
	http.HandleFunc("/api/tasks/", corsMiddleware(tasksHandler))
	http.HandleFunc("/api/commands", corsMiddleware(commandsHandler))
	http.HandleFunc("/api/commands/", corsMiddleware(commandsHandler))

	fmt.Printf("Backend running on :%s\n", port)
	fmt.Printf("Scripts directory: %s\n", scriptsDir)
	fmt.Printf("Tasks directory: %s\n", tasksDir)
	fmt.Printf("Commands directory: %s\n", commandsDir)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
