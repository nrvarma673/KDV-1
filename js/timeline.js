/* ==========================================================================
   timeline.js — logic for timeline.html (family-only photo timeline)
   ========================================================================== */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function renderLockedPanel() {
  const root = document.getElementById("timeline-root");
  root.innerHTML = `
    <div class="locked-panel">
      <div class="lock-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
      <h2>This is a private family album</h2>
      <p>Krishna's full year-by-year photo timeline is only visible to logged-in
         family members. Please log in to continue.</p>
      <a href="login.html" class="btn btn-primary">Family Login</a>
    </div>
  `;
}

function renderTimeline() {
  const root = document.getElementById("timeline-root");
  root.innerHTML = `<p class="empty-state">Loading timeline…</p>`;

  db.collection("years")
    .orderBy("order", "asc")
    .get()
    .then((yearsSnap) => {
      if (yearsSnap.empty) {
        root.innerHTML = `<p class="empty-state">No timeline years have been set up yet. An admin can add them from the Admin panel.</p>`;
        return;
      }

      const wrap = document.createElement("div");
      wrap.className = "timeline";

      const yearPromises = [];
      yearsSnap.forEach((yearDoc) => {
        const year = yearDoc.data();
        const yearId = yearDoc.id;

        const block = document.createElement("div");
        block.className = "year-block";
        block.innerHTML = `
          <div class="year-header">
            <h3>${escapeHtml(year.label || "Untitled Year")}</h3>
          </div>
          <p class="year-caption">${escapeHtml(year.caption || "")}</p>
          <div class="photo-grid" id="grid-${yearId}">
            <div class="photo-tile placeholder">Loading photos…</div>
          </div>
        `;
        wrap.appendChild(block);

        const p = db.collection("years").doc(yearId).collection("photos")
          .orderBy("uploadedAt", "desc").get()
          .then((photoSnap) => {
            const grid = block.querySelector(`#grid-${yearId}`);
            grid.innerHTML = "";
            if (photoSnap.empty) {
              grid.innerHTML = `
                <div class="photo-tile placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:26px;height:26px;margin-bottom:6px;"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="13" r="3.2"/></svg>
                  <span>No photos yet — add one from Admin</span>
                </div>`;
              return;
            }
            photoSnap.forEach((pd) => {
              const photo = pd.data();
              const fitStyle = photo.fit === "contain" ? "contain" : "cover";
              const tile = document.createElement("div");
              tile.className = "photo-tile";
              tile.innerHTML = `
                <img src="${photo.url}" alt="${escapeHtml(photo.caption || year.label)}" loading="lazy" style="object-fit:${fitStyle};">
                ${photo.caption ? `<div class="photo-caption">${escapeHtml(photo.caption)}</div>` : ""}
              `;
              grid.appendChild(tile);
            });
          });
        yearPromises.push(p);
      });

      root.innerHTML = "";
      root.appendChild(wrap);
      return Promise.all(yearPromises);
    })
    .catch((err) => {
      console.error(err);
      root.innerHTML = `<p class="empty-state">Timeline could not be loaded. Please try again later.</p>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
  initAuthNav();
  auth.onAuthStateChanged((user) => {
    if (user) {
      renderTimeline();
    } else {
      renderLockedPanel();
    }
  });
});
