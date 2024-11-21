document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we're on by checking the URL
    const isUpdatesPage = window.location.pathname.includes('updates.html');
    const isProjectsPage = window.location.pathname.includes('projects.html');

    let dataFile = '';
    let contentType = '';

    if (isUpdatesPage) {
        dataFile = 'updates.json';
        contentType = 'updates';
    } else if (isProjectsPage) {
        dataFile = 'projects.json';
        contentType = 'projects';
    } else {
        // If neither, exit the script
        return;
    }

    // Fetch the appropriate JSON file
    fetch(dataFile)
        .then(response => response.json())
        .then(data => {
            // Reverse the data array to display most recent items first
            const reversedData = data.slice().reverse();

            const postList = document.querySelector('.post-list');
            const contentArea = document.querySelector('.content-area');

            reversedData.forEach((item, index) => {
                // Create list item for the sidebar
                const li = document.createElement('li');
                li.setAttribute('data-post', item.id);
                if (index === 0) li.classList.add('active');

                li.innerHTML = `
                    <span class="post-title">${item.title}</span>
                    <span class="post-date">${item.date}</span>
                `;
                postList.appendChild(li);

                // Create content div
                const contentDiv = document.createElement('div');
                contentDiv.setAttribute('id', item.id);
                contentDiv.classList.add('post-content');
                if (index === 0) contentDiv.classList.add('active');

                contentDiv.innerHTML = `
                    <h2>${item.title}</h2>
                    ${item.content}
                `;
                contentArea.appendChild(contentDiv);
            });

            // Add event listeners to sidebar items
            const postListItems = document.querySelectorAll('.post-list li');
            const postContents = document.querySelectorAll('.post-content');

            // Add event listeners to sidebar items
            postListItems.forEach(item => {
                item.addEventListener('click', () => {
                    // Remove 'active' class from all items
                    postListItems.forEach(li => li.classList.remove('active'));
                    postContents.forEach(content => content.classList.remove('active'));
                
                    // Add 'active' class to clicked item and corresponding content
                    item.classList.add('active');
                    const postId = item.getAttribute('data-post');
                    document.getElementById(postId).classList.add('active');
                
                    // Update the URL hash without reloading the page
                    history.replaceState(null, null, `#${postId}`);
                });
            });

            // Add this function to activate the post based on the URL hash
            function activatePostFromHash() {
                const hash = window.location.hash.substring(1); // Remove the '#' character
                if (hash) {
                    // Find the corresponding post
                    const targetContent = document.getElementById(hash);
                    const targetListItem = document.querySelector(`.post-list li[data-post="${hash}"]`);
                
                    if (targetContent && targetListItem) {
                        // Remove 'active' class from all items
                        const postListItems = document.querySelectorAll('.post-list li');
                        const postContents = document.querySelectorAll('.post-content');
                        postListItems.forEach(li => li.classList.remove('active'));
                        postContents.forEach(content => content.classList.remove('active'));
                    
                        // Add 'active' class to the target items
                        targetListItem.classList.add('active');
                        targetContent.classList.add('active');
                    
                        // Scroll to the top of the content area
                        document.querySelector('.content-area').scrollTop = 0;
                    }
                }
            }
            
            // Call the function after data has been loaded
            activatePostFromHash();
            
        })
        .catch(error => {
            console.error('Error loading data:', error);
        });
});


