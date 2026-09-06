const API = `${window.location.protocol}//${window.location.hostname}:${window.location.port === "5000" ? window.location.port : "5000"}/api/leads`;
const modal = document.getElementById("modal");
const form = document.getElementById("leadForm");
const table = document.getElementById("leadTable");
const search = document.getElementById("search");
const toast = document.createElement("div");
toast.className = "toast";
document.body.appendChild(toast);

let leads = [];
const fields = { id: document.getElementById("leadId"), name: document.getElementById("name"), email: document.getElementById("email"), source: document.getElementById("source"), status: document.getElementById("status"), notes: document.getElementById("notes") };

document.getElementById("today").textContent = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date());
document.getElementById("openModal").onclick = () => openForm();
document.getElementById("closeModal").onclick = closeForm;
modal.onclick = event => { if (event.target === modal) closeForm(); };

function openForm(lead = null) {
  form.reset();
  fields.id.value = lead?._id || "";
  document.getElementById("modalTitle").textContent = lead ? "Edit lead" : "Add new lead";
  if (lead) {
    fields.name.value = lead.name;
    fields.email.value = lead.email;
    fields.source.value = lead.source;
    fields.status.value = lead.status;
    fields.notes.value = lead.notes || "";
  }
  modal.classList.add("show");
  fields.name.focus();
}

function closeForm() { modal.classList.remove("show"); }

async function loadLeads() {
  try {
    const response = await fetch(API);
    if (!response.ok) throw new Error("Could not load leads");
    leads = await response.json();
    renderLeads();
    updateStats();
  } catch (error) {
    table.innerHTML = `<tr><td colspan="6" class="empty error-state">Unable to connect. Start the server and try again.</td></tr>`;
  }
}

function renderLeads() {
  const query = search.value.trim().toLowerCase();
  const filtered = leads.filter(lead => [lead.name, lead.email, lead.source, lead.status].some(value => value.toLowerCase().includes(query)));
  document.getElementById("resultCount").textContent = filtered.length;
  if (!filtered.length) {
    table.innerHTML = `<tr><td colspan="6" class="empty">${leads.length ? "No leads match your search." : "No leads yet. Add your first lead to start the pipeline."}</td></tr>`;
    return;
  }
  table.innerHTML = filtered.map(lead => `
    <tr>
      <td><div class="lead-name"><span class="avatar">${escapeHtml(lead.name.charAt(0).toUpperCase())}</span><b>${escapeHtml(lead.name)}</b></div></td>
      <td class="muted">${escapeHtml(lead.email)}</td>
      <td>${escapeHtml(lead.source)}</td>
      <td><select class="status-select ${lead.status}" data-id="${lead._id}" aria-label="Update status for ${escapeHtml(lead.name)}"><option ${lead.status === "New" ? "selected" : ""}>New</option><option ${lead.status === "Contacted" ? "selected" : ""}>Contacted</option><option ${lead.status === "Converted" ? "selected" : ""}>Converted</option></select></td>
      <td class="notes-cell">${escapeHtml(lead.notes || "No follow-up added")}</td>
      <td class="actions"><button class="edit" data-action="edit" data-id="${lead._id}">Edit</button><button class="delete" data-action="delete" data-id="${lead._id}" aria-label="Delete ${escapeHtml(lead.name)}">Delete</button></td>
    </tr>`).join("");
}

function updateStats() {
  document.getElementById("totalCount").textContent = leads.length;
  document.getElementById("newCount").textContent = leads.filter(lead => lead.status === "New").length;
  document.getElementById("contactedCount").textContent = leads.filter(lead => lead.status === "Contacted").length;
  document.getElementById("convertedCount").textContent = leads.filter(lead => lead.status === "Converted").length;
}

form.onsubmit = async event => {
  event.preventDefault();
  const id = fields.id.value;
  const data = { name: fields.name.value.trim(), email: fields.email.value.trim(), source: fields.source.value, status: fields.status.value, notes: fields.notes.value.trim() };
  const response = await fetch(id ? `${API}/${id}` : API, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) return showToast("Could not save this lead", true);
  closeForm();
  showToast(id ? "Lead updated" : "Lead added");
  loadLeads();
};

table.onclick = async event => {
  const button = event.target.closest("button");
  if (!button) return;
  const lead = leads.find(item => item._id === button.dataset.id);
  if (button.dataset.action === "edit" && lead) openForm(lead);
  if (button.dataset.action === "delete" && lead && confirm(`Delete ${lead.name}?`)) {
    const response = await fetch(`${API}/${lead._id}`, { method: "DELETE" });
    if (response.ok) { showToast("Lead deleted"); loadLeads(); }
  }
};

table.onchange = async event => {
  if (!event.target.matches(".status-select")) return;
  const lead = leads.find(item => item._id === event.target.dataset.id);
  const response = await fetch(`${API}/${lead._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...lead, status: event.target.value }) });
  if (response.ok) { showToast("Status updated"); loadLeads(); } else showToast("Could not update status", true);
};

search.oninput = renderLeads;
function showToast(message, isError = false) { toast.textContent = message; toast.className = `toast show ${isError ? "toast-error" : ""}`; setTimeout(() => toast.classList.remove("show"), 2400); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
loadLeads();