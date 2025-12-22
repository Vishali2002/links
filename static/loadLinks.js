async function loadLinks(category, containerId) {
    try {
        const res = await fetch("/api/data");
        const data = await res.json();
        
        let container = document.getElementById(containerId);
        let categoryData = data[category];
        
        if (!categoryData) {
            container.innerHTML = `<p style="color: red;">No data found for ${category}</p>`;
            return;
        }

        container.innerHTML = '';

        for (let team in categoryData) {
            let section = document.createElement('div');
            section.className = 'team-section';
            section.innerHTML = `<h3>${team}</h3>`;
            
            // Create all link items immediately with placeholder icons
            categoryData[team].forEach((item) => {
                const linkItem = document.createElement('a');
                linkItem.href = item.url;
                linkItem.target = '_blank';
                linkItem.className = 'link-item';
                
                // Create placeholder favicon (loading state)
                const favicon = document.createElement('img');
                favicon.className = 'link-favicon';
                favicon.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="100%" height="100%" fill="%23e0e0e0"/><circle cx="16" cy="16" r="8" fill="%23999"/></svg>';
                favicon.dataset.url = item.url; // Store URL for lazy loading
                
                const linkDesc = document.createElement('div');
                linkDesc.className = 'link-description';
                linkDesc.textContent = item.description;
                
                linkItem.appendChild(favicon);
                linkItem.appendChild(linkDesc);
                
                section.appendChild(linkItem);
            });
            
            container.appendChild(section);
            
            // Now fetch all favicons in parallel for this team (background loading)
            const faviconPromises = categoryData[team].map((item, index) => 
                fetch(`/api/favicon?url=${encodeURIComponent(item.url)}`)
                    .then(res => res.json())
                    .then(faviconData => ({ index, faviconData }))
                    .catch(() => ({ index, faviconData: { favicon: null, status: 'error' } }))
            );
            
            // Update favicons as they load
            Promise.all(faviconPromises).then(results => {
                const linkItems = section.querySelectorAll('.link-favicon');
                results.forEach(({ index, faviconData }) => {
                    const favicon = linkItems[index];
                    if (faviconData.favicon) {
                        favicon.src = `/api/proxy-favicon?url=${encodeURIComponent(faviconData.favicon)}`;
                        favicon.onerror = () => {
                            favicon.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="100%" height="100%" fill="%23ccc"/><text x="50%" y="65%" font-size="20" text-anchor="middle" fill="%23666">?</text></svg>';
                        };
                    } else {
                        favicon.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="100%" height="100%" fill="%23ccc"/><text x="50%" y="65%" font-size="20" text-anchor="middle" fill="%23666">?</text></svg>';
                    }
                });
            });
        }
    } catch (err) {
        document.getElementById(containerId).innerHTML = 
            `<p style="color: red;">Error loading data: ${err.message}</p>`;
    }
}
