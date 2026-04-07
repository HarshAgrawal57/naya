package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

// ─────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────

type Employee struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Email      string  `json:"email"`
	Department string  `json:"department"`
	Role       string  `json:"role"`
	AvatarURL  string  `json:"avatar_url"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	IsActive   bool    `json:"is_active"`
}

type CheckInRecord struct {
	ID           string     `json:"id"`
	EmployeeID   string     `json:"employee_id"`
	EmployeeName string     `json:"employee_name"`
	Department   string     `json:"department"`
	CheckIn      time.Time  `json:"check_in"`
	CheckOut     *time.Time `json:"check_out,omitempty"`
	Duration     float64    `json:"duration_hours"`
	Status       string     `json:"status"` // present, late, early_leave, absent
	Method       string     `json:"method"` // face_id, badge, manual, geo
	Location     string     `json:"location"`
	Lat          float64    `json:"lat"`
	Lng          float64    `json:"lng"`
	Notes        string     `json:"notes"`
}

type Alert struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // late, absent, overtime, unauthorized
	Message   string    `json:"message"`
	Employee  string    `json:"employee"`
	Severity  string    `json:"severity"` // info, warning, critical
	Timestamp time.Time `json:"timestamp"`
	Read      bool      `json:"read"`
}

type DashboardStats struct {
	TotalEmployees   int     `json:"total_employees"`
	PresentToday     int     `json:"present_today"`
	AbsentToday      int     `json:"absent_today"`
	LateToday        int     `json:"late_today"`
	OnLeave          int     `json:"on_leave"`
	AttendanceRate   float64 `json:"attendance_rate"`
	AvgCheckInTime   string  `json:"avg_check_in_time"`
	OvertimeCount    int     `json:"overtime_count"`
	UnreadAlerts     int     `json:"unread_alerts"`
}

type HeatmapPoint struct {
	Hour       int     `json:"hour"`
	DayOfWeek  int     `json:"day_of_week"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

type DeptStats struct {
	Department     string  `json:"department"`
	Total          int     `json:"total"`
	Present        int     `json:"present"`
	AttendanceRate float64 `json:"attendance_rate"`
	AvgHours       float64 `json:"avg_hours"`
	Color          string  `json:"color"`
}

// ─────────────────────────────────────────────
// In-Memory Store
// ─────────────────────────────────────────────

type Store struct {
	mu        sync.RWMutex
	employees map[string]*Employee
	records   []*CheckInRecord
	alerts    []*Alert
	clients   map[*websocket.Conn]bool
	broadcast chan interface{}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func NewStore() *Store {
	s := &Store{
		employees: make(map[string]*Employee),
		records:   []*CheckInRecord{},
		alerts:    []*Alert{},
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan interface{}, 100),
	}
	s.seed()
	return s
}

// ─────────────────────────────────────────────
// Seed Data
// ─────────────────────────────────────────────

var depts = []string{"Engineering", "Design", "Marketing", "HR", "Finance", "Operations"}
var roles = map[string][]string{
	"Engineering": {"Senior Engineer", "Backend Dev", "Frontend Dev", "DevOps", "QA Engineer"},
	"Design":      {"UI Designer", "UX Researcher", "Product Designer", "Motion Designer"},
	"Marketing":   {"Marketing Lead", "Content Writer", "SEO Specialist", "Social Media"},
	"HR":          {"HR Manager", "Recruiter", "HR Coordinator"},
	"Finance":     {"Finance Analyst", "Accountant", "Controller"},
	"Operations":  {"Operations Lead", "Project Manager", "Coordinator"},
}
var methods = []string{"face_id", "badge", "geo", "manual"}
var locations = []string{"HQ - Floor 1", "HQ - Floor 2", "HQ - Floor 3", "Remote", "Branch Office"}
var names = []string{
	"Aarav Shah", "Priya Patel", "Rohan Mehta", "Ananya Singh", "Vikram Joshi",
	"Kavya Nair", "Arjun Kumar", "Shreya Iyer", "Rahul Verma", "Pooja Sharma",
	"Aditya Rao", "Riya Gupta", "Karan Malhotra", "Simran Kaur", "Dev Reddy",
	"Nisha Pillai", "Amit Tiwari", "Meera Bose", "Siddharth Agarwal", "Tanvi Desai",
	"Nikhil Pandey", "Divya Mishra", "Harsh Saxena", "Sneha Chatterjee", "Manav Das",
	"Ishaan Kapoor", "Ridhi Bhatt", "Varun Nambiar", "Palak Chaudhary", "Yash Srivastava",
}

func (s *Store) seed() {
	now := time.Now()
	officeStart := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, now.Location())
	baseLat, baseLng := 18.5204, 73.8567 // Pune

	for i, name := range names {
		dept := depts[i%len(depts)]
		roleList := roles[dept]
		emp := &Employee{
			ID:         uuid.New().String()[:8],
			Name:       name,
			Email:      strings.ToLower(strings.ReplaceAll(name, " ", ".")) + "@acme.com",
			Department: dept,
			Role:       roleList[i%len(roleList)],
			AvatarURL:  fmt.Sprintf("https://api.dicebear.com/7.x/avataaars/svg?seed=%s", name),
			Lat:        baseLat + (rand.Float64()-0.5)*0.05,
			Lng:        baseLng + (rand.Float64()-0.5)*0.05,
			IsActive:   true,
		}
		s.employees[emp.ID] = emp

		// Simulate today's attendance for ~80% of employees
		if rand.Float64() > 0.20 {
			minsLate := rand.Intn(60) - 15 // -15 to +45 mins
			checkIn := officeStart.Add(time.Duration(minsLate) * time.Minute)
			status := "present"
			if minsLate > 15 {
				status = "late"
			}

			var checkOut *time.Time
			var duration float64
			if rand.Float64() > 0.3 { // 70% checked out
				hoursWorked := 7.5 + rand.Float64()*2
				co := checkIn.Add(time.Duration(hoursWorked*60) * time.Minute)
				checkOut = &co
				duration = hoursWorked
			}

			rec := &CheckInRecord{
				ID:           uuid.New().String()[:12],
				EmployeeID:   emp.ID,
				EmployeeName: emp.Name,
				Department:   emp.Department,
				CheckIn:      checkIn,
				CheckOut:     checkOut,
				Duration:     math.Round(duration*100) / 100,
				Status:       status,
				Method:       methods[rand.Intn(len(methods))],
				Location:     locations[rand.Intn(len(locations))],
				Lat:          emp.Lat,
				Lng:          emp.Lng,
			}
			s.records = append(s.records, rec)
		}

		// Seed historical records (last 14 days)
		for d := 1; d <= 14; d++ {
			past := now.AddDate(0, 0, -d)
			weekday := past.Weekday()
			if weekday == time.Saturday || weekday == time.Sunday {
				continue
			}
			if rand.Float64() > 0.15 {
				dayStart := time.Date(past.Year(), past.Month(), past.Day(), 9, 0, 0, 0, past.Location())
				minsLate := rand.Intn(50) - 10
				ci := dayStart.Add(time.Duration(minsLate) * time.Minute)
				hoursWorked := 7.0 + rand.Float64()*3
				co := ci.Add(time.Duration(hoursWorked*60) * time.Minute)
				status := "present"
				if minsLate > 15 {
					status = "late"
				}
				s.records = append(s.records, &CheckInRecord{
					ID:           uuid.New().String()[:12],
					EmployeeID:   emp.ID,
					EmployeeName: emp.Name,
					Department:   emp.Department,
					CheckIn:      ci,
					CheckOut:     &co,
					Duration:     math.Round(hoursWorked*100) / 100,
					Status:       status,
					Method:       methods[rand.Intn(len(methods))],
					Location:     locations[rand.Intn(len(locations))],
					Lat:          emp.Lat,
					Lng:          emp.Lng,
				})
			}
		}
	}

	// Seed alerts
	alertMessages := []struct{ msg, emp, atype, severity string }{
		{"Unauthorized zone access detected", "Rahul Verma", "unauthorized", "critical"},
		{"Missed check-out yesterday", "Priya Patel", "absent", "warning"},
		{"Overtime exceeds 3 hours", "Arjun Kumar", "overtime", "info"},
		{"Late arrival for 3rd consecutive day", "Meera Bose", "late", "warning"},
		{"Check-in from unusual location", "Dev Reddy", "unauthorized", "critical"},
	}
	for _, a := range alertMessages {
		s.alerts = append(s.alerts, &Alert{
			ID:        uuid.New().String()[:8],
			Type:      a.atype,
			Message:   a.msg,
			Employee:  a.emp,
			Severity:  a.severity,
			Timestamp: now.Add(-time.Duration(rand.Intn(120)) * time.Minute),
			Read:      rand.Float64() > 0.5,
		})
	}
}

// ─────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────

func (s *Store) handleDashboard(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	today := time.Now().Format("2006-01-02")
	present, late, checkInMins := 0, 0, 0
	checkedInIDs := map[string]bool{}
	overtime := 0

	for _, rec := range s.records {
		if rec.CheckIn.Format("2006-01-02") == today {
			checkedInIDs[rec.EmployeeID] = true
			if rec.Status == "late" {
				late++
			} else {
				present++
			}
			checkInMins += rec.CheckIn.Hour()*60 + rec.CheckIn.Minute()
			if rec.Duration > 9 {
				overtime++
			}
		}
	}

	totalPresent := present + late
	totalEmp := len(s.employees)
	absent := totalEmp - totalPresent
	rate := 0.0
	if totalEmp > 0 {
		rate = math.Round(float64(totalPresent)/float64(totalEmp)*1000) / 10
	}

	avgTime := "09:00"
	if totalPresent > 0 {
		avgMins := checkInMins / totalPresent
		avgTime = fmt.Sprintf("%02d:%02d", avgMins/60, avgMins%60)
	}

	unread := 0
	for _, a := range s.alerts {
		if !a.Read {
			unread++
		}
	}

	json.NewEncoder(w).Encode(DashboardStats{
		TotalEmployees: totalEmp,
		PresentToday:   totalPresent,
		AbsentToday:    absent,
		LateToday:      late,
		OnLeave:        rand.Intn(5) + 1,
		AttendanceRate: rate,
		AvgCheckInTime: avgTime,
		OvertimeCount:  overtime,
		UnreadAlerts:   unread,
	})
}

func (s *Store) handleEmployees(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dept := r.URL.Query().Get("dept")
	emps := []*Employee{}
	for _, e := range s.employees {
		if dept == "" || e.Department == dept {
			emps = append(emps, e)
		}
	}
	sort.Slice(emps, func(i, j int) bool { return emps[i].Name < emps[j].Name })
	json.NewEncoder(w).Encode(emps)
}

func (s *Store) handleRecords(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	date := r.URL.Query().Get("date")
	empID := r.URL.Query().Get("emp_id")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	result := []*CheckInRecord{}
	for _, rec := range s.records {
		if rec.CheckIn.Format("2006-01-02") == date {
			if empID == "" || rec.EmployeeID == empID {
				result = append(result, rec)
			}
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CheckIn.After(result[j].CheckIn)
	})
	json.NewEncoder(w).Encode(result)
}

func (s *Store) handleCheckIn(w http.ResponseWriter, r *http.Request) {
	var body struct {
		EmployeeID string  `json:"employee_id"`
		Method     string  `json:"method"`
		Lat        float64 `json:"lat"`
		Lng        float64 `json:"lng"`
		Notes      string  `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	emp, ok := s.employees[body.EmployeeID]
	if !ok {
		http.Error(w, "employee not found", 404)
		return
	}

	now := time.Now()
	officeStart := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, now.Location())
	status := "present"
	if now.After(officeStart.Add(15 * time.Minute)) {
		status = "late"
	}

	rec := &CheckInRecord{
		ID:           uuid.New().String()[:12],
		EmployeeID:   emp.ID,
		EmployeeName: emp.Name,
		Department:   emp.Department,
		CheckIn:      now,
		Status:       status,
		Method:       body.Method,
		Location:     locations[rand.Intn(len(locations))],
		Lat:          body.Lat,
		Lng:          body.Lng,
		Notes:        body.Notes,
	}
	s.records = append(s.records, rec)

	// Broadcast to websocket clients
	s.broadcast <- map[string]interface{}{
		"type":   "checkin",
		"record": rec,
	}

	// Create late alert
	if status == "late" {
		alert := &Alert{
			ID:        uuid.New().String()[:8],
			Type:      "late",
			Message:   fmt.Sprintf("%s checked in %d minutes late", emp.Name, int(now.Sub(officeStart).Minutes())),
			Employee:  emp.Name,
			Severity:  "warning",
			Timestamp: now,
			Read:      false,
		}
		s.alerts = append(s.alerts, alert)
		s.broadcast <- map[string]interface{}{"type": "alert", "alert": alert}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rec)
}

func (s *Store) handleCheckOut(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	recID := vars["id"]

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, rec := range s.records {
		if rec.ID == recID {
			if rec.CheckOut != nil {
				http.Error(w, "already checked out", 400)
				return
			}
			now := time.Now()
			rec.CheckOut = &now
			rec.Duration = math.Round(now.Sub(rec.CheckIn).Hours()*100) / 100
			s.broadcast <- map[string]interface{}{"type": "checkout", "record": rec}
			json.NewEncoder(w).Encode(rec)
			return
		}
	}
	http.Error(w, "record not found", 404)
}

func (s *Store) handleAlerts(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	alerts := make([]*Alert, len(s.alerts))
	copy(alerts, s.alerts)
	sort.Slice(alerts, func(i, j int) bool {
		return alerts[i].Timestamp.After(alerts[j].Timestamp)
	})
	json.NewEncoder(w).Encode(alerts)
}

func (s *Store) handleMarkAlertRead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, a := range s.alerts {
		if a.ID == id {
			a.Read = true
			json.NewEncoder(w).Encode(a)
			return
		}
	}
	http.Error(w, "not found", 404)
}

func (s *Store) handleHeatmap(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	counts := make(map[int]map[int]int) // day -> hour -> count
	for d := 0; d < 7; d++ {
		counts[d] = make(map[int]int)
	}

	cutoff := time.Now().AddDate(0, 0, -28)
	for _, rec := range s.records {
		if rec.CheckIn.Before(cutoff) {
			continue
		}
		day := int(rec.CheckIn.Weekday())
		hour := rec.CheckIn.Hour()
		counts[day][hour]++
	}

	maxCount := 1
	for _, dayMap := range counts {
		for _, c := range dayMap {
			if c > maxCount {
				maxCount = c
			}
		}
	}

	points := []HeatmapPoint{}
	for day := 0; day < 7; day++ {
		for hour := 6; hour <= 20; hour++ {
			c := counts[day][hour]
			points = append(points, HeatmapPoint{
				Hour:       hour,
				DayOfWeek:  day,
				Count:      c,
				Percentage: math.Round(float64(c)/float64(maxCount)*100) / 100,
			})
		}
	}
	json.NewEncoder(w).Encode(points)
}

func (s *Store) handleDeptStats(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	today := time.Now().Format("2006-01-02")
	colors := map[string]string{
		"Engineering": "#7F77DD",
		"Design":      "#1D9E75",
		"Marketing":   "#D85A30",
		"HR":          "#D4537E",
		"Finance":     "#378ADD",
		"Operations":  "#BA7517",
	}

	deptTotals := map[string]int{}
	deptPresent := map[string]int{}
	deptHours := map[string]float64{}

	for _, e := range s.employees {
		deptTotals[e.Department]++
	}
	for _, rec := range s.records {
		if rec.CheckIn.Format("2006-01-02") == today {
			deptPresent[rec.Department]++
			deptHours[rec.Department] += rec.Duration
		}
	}

	stats := []DeptStats{}
	for dept, total := range deptTotals {
		present := deptPresent[dept]
		hours := deptHours[dept]
		avgHours := 0.0
		if present > 0 {
			avgHours = math.Round(hours/float64(present)*100) / 100
		}
		stats = append(stats, DeptStats{
			Department:     dept,
			Total:          total,
			Present:        present,
			AttendanceRate: math.Round(float64(present)/float64(total)*1000) / 10,
			AvgHours:       avgHours,
			Color:          colors[dept],
		})
	}
	sort.Slice(stats, func(i, j int) bool { return stats[i].Department < stats[j].Department })
	json.NewEncoder(w).Encode(stats)
}

func (s *Store) handleTrend(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	type TrendPoint struct {
		Date           string  `json:"date"`
		Present        int     `json:"present"`
		Absent         int     `json:"absent"`
		Late           int     `json:"late"`
		AttendanceRate float64 `json:"attendance_rate"`
	}

	totalEmps := len(s.employees)
	points := []TrendPoint{}
	for d := 13; d >= 0; d-- {
		day := time.Now().AddDate(0, 0, -d)
		if day.Weekday() == time.Saturday || day.Weekday() == time.Sunday {
			continue
		}
		dateStr := day.Format("2006-01-02")
		present, late := 0, 0
		for _, rec := range s.records {
			if rec.CheckIn.Format("2006-01-02") == dateStr {
				if rec.Status == "late" {
					late++
				} else {
					present++
				}
			}
		}
		total := present + late
		points = append(points, TrendPoint{
			Date:           day.Format("Jan 02"),
			Present:        present,
			Late:           late,
			Absent:         totalEmps - total,
			AttendanceRate: math.Round(float64(total)/float64(totalEmps)*1000) / 10,
		})
	}
	json.NewEncoder(w).Encode(points)
}

func (s *Store) handleLiveMap(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	type MapEmployee struct {
		ID         string  `json:"id"`
		Name       string  `json:"name"`
		Department string  `json:"department"`
		Status     string  `json:"status"`
		CheckInAt  string  `json:"check_in_at"`
		Lat        float64 `json:"lat"`
		Lng        float64 `json:"lng"`
	}

	today := time.Now().Format("2006-01-02")
	checkedIn := map[string]*CheckInRecord{}
	for _, rec := range s.records {
		if rec.CheckIn.Format("2006-01-02") == today {
			checkedIn[rec.EmployeeID] = rec
		}
	}

	result := []MapEmployee{}
	for _, emp := range s.employees {
		status := "absent"
		checkInAt := ""
		if rec, ok := checkedIn[emp.ID]; ok {
			status = rec.Status
			checkInAt = rec.CheckIn.Format("15:04")
		}
		result = append(result, MapEmployee{
			ID:         emp.ID,
			Name:       emp.Name,
			Department: emp.Department,
			Status:     status,
			CheckInAt:  checkInAt,
			Lat:        emp.Lat,
			Lng:        emp.Lng,
		})
	}
	json.NewEncoder(w).Encode(result)
}

// ─────────────────────────────────────────────
// WebSocket
// ─────────────────────────────────────────────

func (s *Store) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS upgrade error:", err)
		return
	}
	s.mu.Lock()
	s.clients[conn] = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, conn)
		s.mu.Unlock()
		conn.Close()
	}()

	// Keep alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (s *Store) broadcastWorker() {
	for msg := range s.broadcast {
		data, _ := json.Marshal(msg)
		s.mu.Lock()
		for conn := range s.clients {
			conn.WriteMessage(websocket.TextMessage, data)
		}
		s.mu.Unlock()
	}
}

// Simulate live activity every 30 seconds
func (s *Store) simulateLiveActivity() {
	ticker := time.NewTicker(30 * time.Second)
	for range ticker.C {
		s.mu.Lock()
		emps := []*Employee{}
		for _, e := range s.employees {
			emps = append(emps, e)
		}
		emp := emps[rand.Intn(len(emps))]
		now := time.Now()
		rec := &CheckInRecord{
			ID:           uuid.New().String()[:12],
			EmployeeID:   emp.ID,
			EmployeeName: emp.Name,
			Department:   emp.Department,
			CheckIn:      now,
			Status:       "present",
			Method:       methods[rand.Intn(len(methods))],
			Location:     locations[rand.Intn(len(locations))],
			Lat:          emp.Lat,
			Lng:          emp.Lng,
		}
		s.records = append(s.records, rec)
		s.mu.Unlock()

		s.broadcast <- map[string]interface{}{
			"type":    "live_checkin",
			"record":  rec,
			"message": fmt.Sprintf("%s just checked in via %s", emp.Name, rec.Method),
		}
	}
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

func main() {
	store := NewStore()
	go store.broadcastWorker()
	go store.simulateLiveActivity()

	r := mux.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			next.ServeHTTP(w, req)
		})
	})

	api := r.PathPrefix("/api/v1").Subrouter()
	api.HandleFunc("/dashboard", store.handleDashboard).Methods("GET")
	api.HandleFunc("/employees", store.handleEmployees).Methods("GET")
	api.HandleFunc("/records", store.handleRecords).Methods("GET")
	api.HandleFunc("/checkin", store.handleCheckIn).Methods("POST")
	api.HandleFunc("/checkout/{id}", store.handleCheckOut).Methods("POST")
	api.HandleFunc("/alerts", store.handleAlerts).Methods("GET")
	api.HandleFunc("/alerts/{id}/read", store.handleMarkAlertRead).Methods("POST")
	api.HandleFunc("/heatmap", store.handleHeatmap).Methods("GET")
	api.HandleFunc("/dept-stats", store.handleDeptStats).Methods("GET")
	api.HandleFunc("/trend", store.handleTrend).Methods("GET")
	api.HandleFunc("/live-map", store.handleLiveMap).Methods("GET")

	r.HandleFunc("/ws", store.handleWS)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(r)
	port := ":8080"
	log.Printf("🚀 Attendance server running on http://localhost%s", port)
	log.Printf("📡 WebSocket available at ws://localhost%s/ws", port)
	log.Printf("📊 %d employees seeded | %d records generated", len(store.employees), len(store.records))
	log.Fatal(http.ListenAndServe(port, handler))
}
