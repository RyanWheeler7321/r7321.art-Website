document.addEventListener('DOMContentLoaded', () => {

    // Load recent updates
    fetch('updates.json')
        .then(response => response.json())
        .then(data => {
            const updatesButtons = document.querySelector('.updates-buttons');
            // Reverse the data array to get most recent updates first
            const reversedData = data.slice().reverse();
            // Get the three most recent updates
            const recentUpdates = reversedData.slice(0, 5);
            recentUpdates.forEach(update => {
                const a = document.createElement('a');
                a.href = `updates.html#${update.id}`;
                a.classList.add('update-button');

                a.innerHTML = `
                    <h3>${update.title}</h3>
                    <p>${update.date}</p>
                `;
                updatesButtons.appendChild(a);
            });
        });

    // Load projects
    fetch('projects.json')
        .then(response => response.json())
        .then(data => {
            const projectsButtons = document.querySelector('.projects-buttons');
            // Reverse the data array to get most recent projects first
            const reversedData = data.slice().reverse();
            reversedData.forEach(project => {
                const a = document.createElement('a');
                a.href = `projects.html#${project.id}`;
                a.classList.add('project-button');

                a.innerHTML = `
                    <img src="${project.image}" alt="${project.title}">
                    <h3>${project.title}</h3>
                `;
                projectsButtons.appendChild(a);
            });
        });
});
