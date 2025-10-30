/************************************************************
 * CONFIG & HELPERS
 ************************************************************/
const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token");
if (!token) window.location.href = "/login.html";

function showAlert(msg, type = "info") {
  alert(msg);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

document.addEventListener("DOMContentLoaded", () => {
  loadOverview();
  loadReports();
  loadNotifications();
});

async function loadOverview() {
  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reports = await res.json();
    if (!res.ok) throw new Error(reports.message);

    document.getElementById("totalReports").textContent = reports.length;

    const sample = reports[0];
    document.getElementById("adminDepartment").textContent =
      sample?.category || "General";

    const reportStats = {
      Pending: reports.filter((r) => r.status === "Pending").length,
      Approved: reports.filter((r) => r.status === "Approved").length,
      Rejected: reports.filter((r) => r.status === "Rejected").length,
    };

    renderChart(reportStats);
  } catch (err) {
    console.error("Error loading overview:", err.message);
  }
}

async function loadReports() {
  const reportsContainer = document.getElementById("reportsContainer");
  if (!reportsContainer) return;

  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reports = await res.json();
    if (!res.ok) throw new Error(reports.message);

    reportsContainer.innerHTML = reports.length
      ? reports
          .map(
            (r) => `
            <div class="report-card">
              <h3>${r.title}</h3>
              <p>${r.description}</p>
              <p><strong>Category:</strong> ${r.category}</p>
              <p><strong>Status:</strong> ${r.status}</p>
              <p><small>Submitted by: ${r.user?.name || "Unknown"}</small></p>
              <div class="report-actions">
                <button onclick="updateReportStatus('${r._id}','Approved')">Approve</button>
                <button onclick="updateReportStatus('${r._id}','Rejected')">Reject</button>
              </div>
            </div>`
          )
          .join("")
      : "<p>No reports in your department.</p>";
  } catch (err) {
    console.error("Error loading reports:", err.message);
  }
}

async function updateReportStatus(reportId, status) {
  try {
    const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showAlert(`✅ Report ${status}`);
    loadReports();
    loadOverview();
  } catch (err) {
    showAlert("Error updating report: " + err.message);
  }
}

async function loadNotifications() {
  const notificationsContainer = document.getElementById("notificationsContainer");
  if (!notificationsContainer) return;

  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notes = await res.json();

    notificationsContainer.innerHTML = notes.length
      ? notes
          .map(
            (n) => `
            <div class="notification ${n.read ? "read" : "unread"}">
              <p>${n.message}</p>
              <small>${formatDate(n.date)}</small>
            </div>`
          )
          .join("")
      : "<p>No notifications.</p>";
  } catch (err) {
    console.error("Error loading notifications:", err.message);
  }
}

function renderChart(reportStats) {
  const ctx = document.getElementById("reportsChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pending", "Approved", "Rejected"],
      datasets: [
        {
          data: [
            reportStats.Pending || 0,
            reportStats.Approved || 0,
            reportStats.Rejected || 0,
          ],
          backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47"],
        },
      ],
    },
  });
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/login.html";
});

/************************************************************
 * 🧮 BENTO ANALYTICS DASHBOARD
 ************************************************************/
let bentoChartInstance;

async function loadBentoAnalytics() {
  try {
    const res = await fetch(`${API_URL}/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (!result.success || !Array.isArray(result.data)) {
      throw new Error("Invalid analytics data format");
    }

    const approved = result.data.filter((r) => r.status === "Approved");

    // Calculate totals
    const totalRevenue = approved.reduce(
      (sum, r) => sum + (r.adminSummary?.revenue || 0),
      0
    );
    const totalProfit = approved.reduce(
      (sum, r) => sum + (r.adminSummary?.profit || 0),
      0
    );
    const totalInventory = approved.reduce(
      (sum, r) => sum + (r.adminSummary?.inventoryValue || 0),
      0
    );

    // Update Bento metrics
    document.getElementById("totalRevenue").textContent =
      "$" + totalRevenue.toLocaleString();
    document.getElementById("totalProfit").textContent =
      "$" + totalProfit.toLocaleString();
    document.getElementById("totalInventory").textContent =
      "$" + totalInventory.toLocaleString();

    // Generate chart trend (3 metrics)
    renderBentoTrendChart(totalRevenue, totalProfit, totalInventory);
  } catch (err) {
    console.error("❌ Bento Analytics Error:", err);
  }
}

function renderBentoTrendChart(revenue, profit, inventory) {
  const ctx = document.getElementById("bentoTrendChart");
  if (!ctx) return;

  if (bentoChartInstance) bentoChartInstance.destroy();

  bentoChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Revenue", "Profit", "Inventory"],
      datasets: [
        {
          label: "Business Overview",
          data: [revenue, profit, inventory],
          fill: true,
          borderColor: "#FF0B55",
          backgroundColor: "rgba(255,11,85,0.1)",
          tension: 0.3,
          pointBackgroundColor: "#FF0B55",
          pointRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "📊 Financial Summary Overview",
          color: "#000",
          font: { size: 16, weight: "bold" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => "$" + v.toLocaleString() },
        },
      },
    },
  });
}

// Auto-refresh every 60 seconds
if (!refreshInterval) {
  refreshInterval = setInterval(loadBentoAnalytics, 60000);
}

// Initial load when admin dashboard opens
document.addEventListener("DOMContentLoaded", loadBentoAnalytics);

