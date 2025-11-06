// API Configuration
const API_CONFIG = {
    // Set your API endpoint URL here
    endpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/current-program',
    // Set to false to use localStorage only (for testing without backend)
    useAPI: true
};

class AdminPanel {
    constructor() {
        this.program = [];
        this.currentProgramIndex = '-1';
        this.init();
    }

    async init() {
        await this.loadCurrentProgram();
        await this.loadProgram();
        this.setupEventListeners();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    async loadCurrentProgram() {
        try {
            if (API_CONFIG.useAPI) {
                const response = await fetch(API_CONFIG.endpoint);
                if (response.ok) {
                    const data = await response.json();
                    this.currentProgramIndex = data.currentProgramIndex || '-1';
                } else {
                    throw new Error('API not available');
                }
            } else {
                // Fallback to localStorage
                this.currentProgramIndex = localStorage.getItem('currentProgramIndex') || '-1';
            }
        } catch (error) {
            console.warn('Using localStorage fallback:', error);
            this.currentProgramIndex = localStorage.getItem('currentProgramIndex') || '-1';
        }
    }

    setupEventListeners() {
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            await this.loadCurrentProgram();
            await this.loadProgram();
        });
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

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const program = {
                index: values[0],
                title: values[1],
                performances: values[2],
                image: values[3],
                is_current: false
            };

            // Set is_current based on currentProgramIndex
            if (this.currentProgramIndex !== '-1' && this.currentProgramIndex === values[0]) {
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

    async toggleCurrent(index) {
        const clickedItem = this.program[index];

        if (clickedItem.is_current) {
            // If clicking the current item, clear it
            await this.updateCurrentProgram('-1');
        } else {
            // Set this item as current
            await this.updateCurrentProgram(clickedItem.index);
        }
    }

    async clearAll() {
        await this.updateCurrentProgram('-1');
    }

    async updateCurrentProgram(programIndex) {
        try {
            if (API_CONFIG.useAPI) {
                const response = await fetch(API_CONFIG.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        currentProgramIndex: programIndex,
                        timestamp: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error('API request failed');
                }

                this.currentProgramIndex = programIndex;

                // Also update localStorage as backup
                if (programIndex === '-1') {
                    localStorage.removeItem('currentProgramIndex');
                } else {
                    localStorage.setItem('currentProgramIndex', programIndex);
                }

                const program = this.program.find(p => p.index === programIndex);
                if (programIndex === '-1') {
                    this.showMessage('Current program cleared', 'success');
                } else {
                    this.showMessage(`Set "${program?.title}" as current program`, 'success');
                }
            } else {
                // Fallback to localStorage only
                this.currentProgramIndex = programIndex;
                if (programIndex === '-1') {
                    localStorage.removeItem('currentProgramIndex');
                    this.showMessage('Current program cleared', 'success');
                } else {
                    localStorage.setItem('currentProgramIndex', programIndex);
                    const program = this.program.find(p => p.index === programIndex);
                    this.showMessage(`Set "${program?.title}" as current program`, 'success');
                }
            }

            // Update the display
            this.program.forEach(item => {
                item.is_current = (item.index === programIndex);
            });
            this.updateDisplay();

        } catch (error) {
            console.error('Error updating current program:', error);
            this.showMessage('Error updating program. Using localStorage fallback.', 'error');

            // Fallback to localStorage
            this.currentProgramIndex = programIndex;
            if (programIndex === '-1') {
                localStorage.removeItem('currentProgramIndex');
            } else {
                localStorage.setItem('currentProgramIndex', programIndex);
            }
            this.program.forEach(item => {
                item.is_current = (item.index === programIndex);
            });
            this.updateDisplay();
        }
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
