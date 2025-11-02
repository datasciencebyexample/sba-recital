class RecitalProgram {
    constructor() {
        this.program = [];
        this.currentIndex = -1;
        this.init();
    }

    async init() {
        await this.loadProgram();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);

        // Listen for localStorage changes from admin panel
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentProgramIndex') {
                this.loadProgram();
            }
        });

        // Also poll for changes every 2 seconds (in case same browser/tab)
        setInterval(() => this.checkForUpdates(), 2000);
    }

    checkForUpdates() {
        const currentProgramIndex = localStorage.getItem('currentProgramIndex');
        const currentProgram = this.program.find(p => p.is_current);
        const currentStoredIndex = currentProgram ? currentProgram.index : null;

        // If localStorage changed, reload
        if (currentProgramIndex !== currentStoredIndex) {
            this.loadProgram();
        }
    }

    async loadProgram() {
        try {
            const response = await fetch('data/programs.csv');
            const csvText = await response.text();
            this.parseCSV(csvText);
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading program:', error);
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        this.program = [];
        this.currentIndex = -1;

        // Get current program index from localStorage
        const currentProgramIndex = localStorage.getItem('currentProgramIndex');

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const program = {
                index: values[0],
                title: values[1],
                performances: values[2],
                image: values[3],
                is_current: false
            };

            // Set is_current based on localStorage
            if (currentProgramIndex !== null && currentProgramIndex === values[0]) {
                program.is_current = true;
                this.currentIndex = i - 1;
            }

            this.program.push(program);
        }
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        return values;
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('dateTime').textContent = now.toLocaleDateString('en-US', options);
    }

    updateDisplay() {
        this.updateCurrentPerformance();
        this.updateNextPerformance();
        this.updateProgramList();
    }

    updateCurrentPerformance() {
        const currentItem = document.getElementById('currentItem');

        if (this.currentIndex === -1 || this.program.length === 0) {
            currentItem.innerHTML = `
                <div class="performer-name">Welcome</div>
                <div class="piece-info">Program will begin shortly</div>
                <div class="status-indicator waiting"></div>
            `;
            return;
        }

        if (this.currentIndex >= this.program.length) {
            currentItem.innerHTML = `
                <div class="performer-name">Program Complete</div>
                <div class="piece-info">Thank you for attending!</div>
                <div class="status-indicator completed"></div>
            `;
            return;
        }

        const current = this.program[this.currentIndex];
        const imagePath = `data/images/${current.image}`;
        currentItem.innerHTML = `
            <img src="${imagePath}" alt="${current.title}" class="program-image" onerror="this.style.display='none'">
            <div class="performer-name">${current.title}</div>
            <div class="piece-info">
                <strong>${current.performances}</strong>
            </div>
            <div class="status-indicator playing"></div>
        `;
    }

    updateNextPerformance() {
        const nextItem = document.getElementById('nextItem');
        const nextIndex = this.currentIndex + 1;

        if (this.currentIndex === -1) {
            if (this.program.length > 0) {
                const first = this.program[0];
                const imagePath = `data/images/${first.image}`;
                nextItem.innerHTML = `
                    <img src="${imagePath}" alt="${first.title}" class="program-image-small" onerror="this.style.display='none'">
                    <div class="performer-name">${first.title}</div>
                    <div class="piece-info">
                        <strong>${first.performances}</strong>
                    </div>
                `;
            } else {
                nextItem.innerHTML = `
                    <div class="performer-name">Loading...</div>
                    <div class="piece-info">Please wait</div>
                `;
            }
            return;
        }

        if (nextIndex >= this.program.length) {
            nextItem.innerHTML = `
                <div class="performer-name">No more performances</div>
                <div class="piece-info">This concludes our recital</div>
            `;
            return;
        }

        const next = this.program[nextIndex];
        const imagePath = `data/images/${next.image}`;
        nextItem.innerHTML = `
            <img src="${imagePath}" alt="${next.title}" class="program-image-small" onerror="this.style.display='none'">
            <div class="performer-name">${next.title}</div>
            <div class="piece-info">
                <strong>${next.performances}</strong>
            </div>
        `;
    }

    updateProgramList() {
        const programItems = document.getElementById('programItems');
        programItems.innerHTML = '';

        this.program.forEach((item, index) => {
            const programItem = document.createElement('div');
            programItem.className = 'program-item';

            let status = 'upcoming';
            let statusText = 'Upcoming';

            if (index < this.currentIndex) {
                status = 'completed';
                statusText = 'Completed';
                programItem.classList.add('completed');
            } else if (index === this.currentIndex) {
                status = 'current';
                statusText = 'Now Playing';
                programItem.classList.add('current');
            } else {
                programItem.classList.add('upcoming');
            }

            const imagePath = `data/images/${item.image}`;
            programItem.innerHTML = `
                <img src="${imagePath}" alt="${item.title}" class="program-thumbnail" onerror="this.style.display='none'">
                <div class="item-info">
                    <div class="item-performer">${item.title}</div>
                    <div class="item-piece">${item.performances}</div>
                </div>
                <div class="item-status ${status}">${statusText}</div>
            `;

            programItems.appendChild(programItem);
        });
    }
}

// Initialize the program when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.recitalProgram = new RecitalProgram();
});