document.addEventListener('DOMContentLoaded', () => {
    // Smooth Scrolling for nav links
    const navLinks = document.querySelectorAll('#navbar .nav-links a');

    navLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            // Only prevent default if the link is an internal link
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();

                // Remove 'active' class from all links
                navLinks.forEach((link) => link.classList.remove('active'));
                // Add 'active' class to the clicked link
                this.classList.add('active');

                // Scroll to the section
                const targetId = this.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);

                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - document.getElementById('navbar').offsetHeight,
                        behavior: 'smooth',
                    });
                }
            }
        });
    });
});

    // Project Details Functionality
    const projectItems = document.querySelectorAll('.project-item');
    const projectDetails = document.getElementById('project-details');

    projectItems.forEach((item) => {
        item.addEventListener('click', function () {
            const projectId = this.dataset.project;
            loadProjectDetails(projectId);
        });
    });

    function loadProjectDetails(projectId) {
        // Replace this with actual project details
        const projectContent = {
            Project1: {
                title: 'Project 1',
                description: 'Detailed description of Project 1.',
            },
            Project2: {
                title: 'Project 2',
                description: 'Detailed description of Project 2.',
            },
            Project3: {
                title: 'Project 3',
                description: 'Detailed description of Project 3.',
            },
            // Add more projects as needed
        };

        const project = projectContent[projectId];

        if (project) {
            projectDetails.style.display = 'block';
            projectDetails.innerHTML = `
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <button id="close-details">Close</button>
            `;
            document
                .getElementById('close-details')
                .addEventListener('click', function () {
                    projectDetails.style.display = 'none';
                });
        }
    }

document.addEventListener('DOMContentLoaded', () => {
    let particleCount = 0;
    const maxParticles = 300;

    function createParticle() {
        if (particleCount >= maxParticles) return;
        particleCount++;

        const particle = document.createElement('div');
        particle.classList.add('particle');

        // Randomize position across the entire scrollable document height
        const pageHeight = document.documentElement.scrollHeight;
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.top = Math.random() * pageHeight + 'px';

        // Randomize movement direction
        const directionX = Math.random() - 0.5;
        const directionY = Math.random();
        particle.style.setProperty('--direction-x', directionX);
        particle.style.setProperty('--direction-y', directionY);

        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
            particleCount--;
        }, 20000);
    }

    // Create particles at regular intervals
    setInterval(createParticle, 2000);

    // Function to create BokehParticles
    function createBokehParticle() {
        const bokehParticle = document.createElement('div');
        bokehParticle.classList.add('bokeh-particle');

        const size = Math.floor(Math.random() * (25 - 6 + 1)) + 6;
        bokehParticle.style.setProperty('--bokeh-size', size + 'px');

        const pageHeight = document.documentElement.scrollHeight;
        bokehParticle.style.left = Math.random() * window.innerWidth + 'px';
        bokehParticle.style.top = Math.random() * pageHeight + 'px';

        // Randomize movement direction
        const directionX = Math.random() - 0.5;
        const directionY = Math.random();
        bokehParticle.style.setProperty('--direction-x', directionX);
        bokehParticle.style.setProperty('--direction-y', directionY);

        document.body.appendChild(bokehParticle);

        setTimeout(() => {
            bokehParticle.remove();
        }, 20000);
    }

    // Create BokehParticles at regular intervals
    setInterval(createBokehParticle, 2000);
});
