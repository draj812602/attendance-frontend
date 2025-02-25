import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-multi-date-picker";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css"; // or another available style
import "./App.css";

const API_BASE_URL = "https://attandance-backend-r6cc.onrender.com/api";

function App() {
  const [empID, setEmpID] = useState("");
  const [empName, setEmpName] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [showAttendance, setShowAttendance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backdateMode, setBackdateMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [backdateSubmitted, setBackdateSubmitted] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["empID", "backdateSubmitted"], (result) => {
      if (result.empID) {
        setEmpID(result.empID);
        fetchEmployeeName(result.empID);
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
      }
      if (result.backdateSubmitted) {
        setBackdateSubmitted(true);
      }
    });

    // Initialize Bootstrap Tooltip
    setTimeout(() => {
      const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
      );
      tooltipTriggerList.forEach((tooltipTriggerEl) => {
        new window.bootstrap.Tooltip(tooltipTriggerEl);
      });
    }, 500);
  }, []);

  const fetchEmployeeName = async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employee?empID=${id}`);
      setEmpName(response.data.empName);
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const handleSave = () => {
    if (!empID || !empName) {
      setMessage("Please enter Employee ID and Name.");
      return;
    }

    setLoading(true);
    axios
      .post(`${API_BASE_URL}/attendance`, { empID })
      .then(() => {
        chrome.storage.local.set({ empID, empName }, () => {
          setMessage("Attendance marked successfully.");
          setIsRegistered(true);
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        setMessage("Failed to mark attendance. Try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchAttendanceRecords = async () => {
    if (!empID) {
      setMessage("Employee ID is missing.");
      return;
    }

    setMessage("");
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/attendance?empID=${empID}`
      );
      setAttendanceRecords(response.data.attendanceRecords);
      setTotalAttendance(response.data.totalAttendance);
      setShowAttendance(true);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      setMessage("Failed to fetch attendance. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdateSubmit = async () => {
    if (selectedDates.length === 0) {
      setMessage("Please select at least one date.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/backdate-attendance`, {
        empID,
        dates: selectedDates.map((date) => date.format("YYYY-MM-DD")), // ✅ Fixed Date Formatting
      });

      setMessage("Backdated attendance marked successfully.");
      setBackdateMode(false);
      setBackdateSubmitted(true);
      chrome.storage.local.set({ backdateSubmitted: true });

      fetchAttendanceRecords(); // Refresh attendance data
    } catch (error) {
      console.error("Error marking backdated attendance:", error);
      setMessage("Failed to mark backdated attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container p-3 text-center app-container">
      <h4 className="fw-bold">Attendance Tracker</h4>

      {!isRegistered ? (
        <>
          <input
            className="form-control mb-2"
            placeholder="Enter Employee ID"
            value={empID}
            onChange={(e) => setEmpID(e.target.value)}
            disabled={loading}
          />
          <input
            className="form-control mb-2"
            placeholder="Enter Employee Name"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            disabled={loading}
          />
          <button
            className="btn btn-primary w-100"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm"></span>
            ) : (
              "Submit"
            )}
          </button>
        </>
      ) : !showAttendance ? (
        <button
          className="btn btn-info w-100 mt-3"
          onClick={fetchAttendanceRecords}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm"></span>
          ) : (
            "View Attendance"
          )}
        </button>
      ) : (
        <>
          {!backdateMode ? (
            <>
              <h5 className="fw-bold">
                Hi {empName} ({empID}), your attendance for this quarter is{" "}
                <strong className="text-primary">{totalAttendance}</strong>
              </h5>

              {!backdateSubmitted && (
                <button
                  className="btn btn-warning mb-3"
                  onClick={() => setBackdateMode(true)}
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  title="This is a one-time process. You cannot log backdated attendance again."
                >
                  Log Backdated Attendance
                </button>
              )}

              <table className="table table-bordered mt-2">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.map((record, index) => (
                      <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.time}</td>
                        <td
                          className={
                            record.status === "Present"
                              ? "text-success fw-bold"
                              : "text-danger fw-bold"
                          }
                        >
                          {record.status}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No attendance records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <div className="card p-4 shadow">
              <h5 className="fw-bold">Select Backdated Attendance</h5>
              <DatePicker
                multiple
                value={selectedDates}
                onChange={setSelectedDates}
                maxDate={new Date()}
                minDate={
                  new Date(
                    new Date().getFullYear(),
                    Math.floor(new Date().getMonth() / 3) * 3,
                    1
                  )
                }
              />
              <button
                className="btn btn-primary mt-3 me-2"
                onClick={handleBackdateSubmit}
              >
                Submit
              </button>
              <button
                className="btn btn-secondary mt-3"
                onClick={() => setBackdateMode(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {message && <p className="mt-3 text-success">{message}</p>}
    </div>
  );
}

export default App;
