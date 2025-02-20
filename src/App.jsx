import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
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
  const [backdateModal, setBackdateModal] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);

  useEffect(() => {
    chrome.storage.local.get("empID", (result) => {
      if (result.empID) {
        setEmpID(result.empID);
        fetchEmployeeName(result.empID);
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
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

  const handleSave = () => {
    if (!empID || !empName) {
      setMessage("Please enter Employee ID and Name.");
      return;
    }

    setLoading(true);

    // Step 1: Register Employee
    axios
      .post(`${API_BASE_URL}/employee`, { empID, empName }) // Now sending both empID and empName
      .then(() => {
        chrome.storage.local.set({ empID, empName }, () => {
          setIsRegistered(true);
          setMessage("Employee registered successfully.");

          // Step 2: Mark Attendance AFTER successful registration
          return axios.post(`${API_BASE_URL}/attendance`, { empID });
        });
      })
      .then(() => {
        setMessage("Attendance marked successfully.");
      })
      .catch((error) => {
        console.error("Error:", error);
        setMessage("Failed to register or mark attendance. Try again.");
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
    if (selectedDates.length === 0) return;

    const formattedDates = selectedDates.map(
      (date) => date.toISOString().split("T")[0]
    );

    try {
      const response = await axios.post(`${API_BASE_URL}/backdate-attendance`, {
        empID,
        dates: formattedDates,
      });

      setMessage(response.data.message);
      fetchAttendanceRecords();
      setBackdateModal(false);
    } catch (error) {
      console.error("Error updating backdated attendance:", error);
      setMessage("Failed to update attendance.");
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
        <div className="attendance-table">
          <div className="d-flex justify-content-between align-items-center">
            <h5>
              Hi {empName} ({empID}), your attendance for this quarter is{" "}
              <strong>{totalAttendance}</strong>
            </h5>
            <button
              className="btn btn-warning"
              onClick={() => setBackdateModal(true)}
            >
              Log Backdate Attendance
            </button>
          </div>

          <table className="table table-bordered mt-2">
            <thead>
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
                    <td>
                      {record.timestamp
                        ? new Date(record.timestamp).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }
                          )
                        : "--"}{" "}
                      {/* ✅ Fix applied */}
                    </td>
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
                ))
              ) : (
                <tr>
                  <td colSpan="3">No attendance records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {backdateModal && (
        <div className="modal">
          <div className="modal-content">
            <h5>Select Backdated Attendance</h5>
            <DatePicker
              selected={selectedDates}
              onChange={(dates) => setSelectedDates(dates)}
              selectsMultiple
              maxDate={new Date()}
              minDate={
                new Date(
                  new Date().getFullYear(),
                  Math.floor(new Date().getMonth() / 3) * 3,
                  1
                )
              }
              dateFormat="yyyy-MM-dd"
              inline
            />
            <button
              className="btn btn-primary mt-2"
              onClick={handleBackdateSubmit}
            >
              Submit
            </button>
            <button
              className="btn btn-secondary mt-2"
              onClick={() => setBackdateModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-success">{message}</p>}
    </div>
  );
}

export default App;
