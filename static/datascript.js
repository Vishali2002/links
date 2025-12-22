const form = document.getElementById('linkForm');
const linksList = document.getElementById('linksList');

function displayLinksTree(links) {
    linksList.innerHTML = '';

    for (const category in links) {
        const catLi = document.createElement('li');
        catLi.innerHTML = `<strong>${category}</strong>`;
        const teamUl = document.createElement('ul');

        for (const team in links[category]) {
            const teamLi = document.createElement('li');
            teamLi.innerHTML = `<em>${team}</em>`;
            const linkUl = document.createElement('ul');

            links[category][team].forEach(link => {
                const li = document.createElement('li');
                li.className = 'link-list-item';
                li.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                        <a href="${link.url}" target="_blank" style="color: #2a72bf; text-decoration: none;">${link.url}</a>
                        <span style="color: #666;">|</span>
                        <span style="color: #333;">${link.description}</span>
                    </div>
                    <div class="link-actions">
                        <button class="edit-btn" onclick="editLink('${category}','${team}','${link.url.replace(/'/g, "\\'")}','${link.description.replace(/'/g, "\\'")}')">Edit</button>
                        <button class="delete-btn" onclick="deleteLink('${category}','${team}','${link.url.replace(/'/g, "\\'")}','${link.description.replace(/'/g, "\\'")}')">Delete</button>
                    </div>
                `;
                linkUl.appendChild(li);
            });

            teamLi.appendChild(linkUl);
            teamUl.appendChild(teamLi);
        }

        catLi.appendChild(teamUl);
        linksList.appendChild(catLi);
    }
}


function loadLinks() {
    fetch('/api/links?t=' + new Date().getTime())
        .then(res => res.json())
        .then(data => displayLinksTree(data))
        .catch(err => console.error('Error loading links:', err));
}

loadLinks();

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const linkData = {
        category: document.getElementById('category').value,
        team: document.getElementById('team').value,
        url: document.getElementById('url').value,
        description: document.getElementById('description').value
    };

    fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            loadLinks();
            form.reset();
            alert('Link added successfully!');
        }
    });
});


function deleteLink(category, team, url, description) {
    if (!confirm("Are you sure you want to delete this link?")) return;

    fetch('/api/links/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, team, url, description })
    })
    .then(res => res.json())
    .then(() => loadLinks());
}


function editLink(category, team, url, description) {
    const new_category = prompt("Enter new Category:", category);
    if (new_category === null) return;
    const new_team = prompt("Enter new Team:", team);
    if (new_team === null) return;
    const new_url = prompt("Enter new URL:", url);
    if (new_url === null) return;
    const new_description = prompt("Enter new Description:", description);
    if (new_description === null) return;

    fetch('/api/links/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            old_category: category,
            old_team: team,
            old_url: url,
            old_description: description,
            new_category,
            new_team,
            new_url,
            new_description
        })
    })
    .then(res => res.json())
    .then(() => loadLinks());
}
