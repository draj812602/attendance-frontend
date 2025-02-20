console.log("Background script loaded and running...");

// Avoid re-execution of attendance marking
let attendanceMarkedToday = false;

chrome.runtime.onStartup.addListener(() => {
  console.log("Chrome started. Checking network...");
  checkNetworkAndMarkAttendance();
});

chrome.alarms.create("checkNetwork", { periodInMinutes: 10 }); // Reduce frequency to 10 min
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkNetwork") {
    console.log("Checking network...");
    checkNetworkAndMarkAttendance();
  }
});

const checkNetworkAndMarkAttendance = () => {
  if (attendanceMarkedToday) {
    console.log("Attendance already marked today. Skipping...");
    return;
  }

  chrome.storage.local.get(["empID"], (result) => {
    if (!result.empID) {
      console.log("Employee ID not found. Registration required.");
      return;
    }

    const empID = result.empID;
    console.log(`Found Employee ID: ${empID}`);

    fetch("https://api64.ipify.org?format=json")
      .then((response) => response.json())
      .then((data) => {
        const userIP = data.ip;
        console.log("User's Public IP:", userIP);
        verifyOfficeIP(userIP, empID);
      })
      .catch((error) => console.error("Failed to get public IP:", error));
  });
};

const verifyOfficeIP = (userIP, empID) => {
  fetch(
    `https://attandance-backend-r6cc.onrender.com/api/verify-ip?ip=${userIP}`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.isOffice) {
        console.log("User is in the office. Marking attendance...");
        markAttendance(empID);
      } else {
        console.log("User is NOT in the office. Attendance not marked.");
      }
    })
    .catch((error) => console.error("Failed to verify office IP:", error));
};

const markAttendance = (empID) => {
  fetch(
    `https://attandance-backend-r6cc.onrender.com/api/employee?empID=${empID}`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.log("Employee not found, skipping attendance.");
        return;
      }

      fetch("https://attandance-backend-r6cc.onrender.com/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empID }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Attendance marked:", data);
          attendanceMarkedToday = true; // Ensure it runs only once per day
        })
        .catch((error) => console.error("Error marking attendance:", error));
    })
    .catch((error) =>
      console.error("Error checking employee existence:", error)
    );
};
