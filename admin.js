class AdminPanel {
    constructor() {
        this.program = [];
        this.init();
    }

    async init() {
        await this.loadProgram();
        this.setupEventListeners();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    setupEventListeners() {
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadProgram());
    }

    async loadProgram() {
        try {
            const response = await fetch('data/programs.csv');
            const csvText = await response.text();
            this.parseCSV(csvText);
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading program:', error);
            this.showMessage('Error loading program data', 'error');
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        this.program = [];

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
        const programItems = document.getElementById('programItems');
        programItems.innerHTML = '';

        this.program.forEach((item, index) => {
            const programItem = document.createElement('div');
            programItem.className = 'program-item admin-program-item';

            if (item.is_current) {
                programItem.classList.add('active');
            }

            const imagePath = `data/images/${item.image}`;
            programItem.innerHTML = `
                <img src="${imagePath}" alt="${item.title}" class="program-thumbnail" onerror="this.style.display='none'">
                <div class="item-info">
                    <div class="item-performer">${item.index}. ${item.title}</div>
                    <div class="item-piece">${item.performances}</div>
                </div>
                <button class="set-current-btn ${item.is_current ? 'active' : ''}" data-index="${index}">
                    ${item.is_current ? 'Clear' : 'Set Current'}
                </button>
            `;

            const button = programItem.querySelector('.set-current-btn');
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCurrent(index);
            });

            programItems.appendChild(programItem);
        });
    }

    toggleCurrent(index) {
        const clickedItem = this.program[index];

        if (clickedItem.is_current) {
            // If clicking the current item, clear it
            this.program.forEach(item => {
                item.is_current = false;
            });
            localStorage.removeItem('currentProgramIndex');
            this.showMessage('Current program cleared', 'success');
        } else {
            // Set this item as current, clear all others
            this.program.forEach((item, i) => {
                item.is_current = (i === index);
            });
            localStorage.setItem('currentProgramIndex', clickedItem.index);
            this.showMessage(`Set "${clickedItem.title}" as current program`, 'success');
        }

        this.updateDisplay();
    }

    clearAll() {
        this.program.forEach(item => {
            item.is_current = false;
        });
        localStorage.removeItem('currentProgramIndex');
        this.showMessage('All programs cleared', 'success');
        this.updateDisplay();
    }

    showMessage(message, type) {
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;

        setTimeout(() => {
            statusMessage.className = 'status-message';
        }, 3000);
    }
}

// Initialize the admin panel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
