import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-multi-date-picker";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css"; // Style fix
import "bootstrap/dist/css/bootstrap.min.css";
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
  }, []);

  const fetchEmployeeName = async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employee?empID=${id}`);
      setEmpName(response.data.empName);
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const handleSave = async () => {
    if (!empID || !empName) {
      setMessage("Please enter Employee ID and Name.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/employee`, { empID, empName });
      await axios.post(`${API_BASE_URL}/attendance`, { empID });

      chrome.storage.local.set({ empID, empName }, () => {
        setMessage("Employee registered and attendance marked successfully.");
        setIsRegistered(true);
      });
    } catch (error) {
      console.error("Error:", error);
      setMessage(
        "You have been successfully registered, but we couldn't mark your attendance. (You might not be in the office). Please try again."
      );
    } finally {
      setLoading(false);
    }
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
        dates: selectedDates.map((date) => date.format("YYYY-MM-DD")),
      });

      setMessage("Backdated attendance marked successfully.");
      setBackdateMode(false);
      setBackdateSubmitted(true);
      chrome.storage.local.set({ backdateSubmitted: true });

      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error marking backdated attendance:", error);
      setMessage("Failed to mark backdated attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container p-3 text-center app-container">
      <h4>Attendance Tracker</h4>

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
              <h5>
                Hi {empName} ({empID}), your attendance for this quarter is{" "}
                <strong>{totalAttendance}</strong>
              </h5>
              {!backdateSubmitted && (
                <button
                  className="btn btn-warning mb-3"
                  onClick={() => setBackdateMode(true)}
                  title="You can only do this once"
                >
                  Log Backdated Attendance
                </button>
              )}
              <table className="table table-bordered mt-2">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record, index) => (
                    <tr key={index}>
                      <td>{record.date}</td>
                      <td>{record.time}</td>
                      <td
                        className={
                          record.status === "Present"
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {record.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="backdate-container">
              <h5>Select Backdated Attendance</h5>
              <DatePicker
                multiple
                value={selectedDates}
                onChange={setSelectedDates}
                format="YYYY-MM-DD"
                maxDate={new Date()}
                minDate={
                  new Date(
                    new Date().getFullYear(),
                    Math.floor(new Date().getMonth() / 3) * 3,
                    1
                  )
                }
                containerStyle={{ zIndex: 9999, position: "relative" }}
                inputClass="form-control backdate-input"
              />

              <button
                className="btn btn-primary mt-2"
                onClick={handleBackdateSubmit}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  "Submit"
                )}
              </button>
              <button
                className="btn btn-secondary mt-2"
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
