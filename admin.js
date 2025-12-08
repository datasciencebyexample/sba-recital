// API Configuration
const API_CONFIG = {
    currentProgramEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/current-program',
    sequencesEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/sequences',
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
                const response = await fetch(API_CONFIG.currentProgramEndpoint);
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
            if (!API_CONFIG.useAPI) {
                throw new Error('API disabled but no local data source available');
            }

            const response = await fetch(API_CONFIG.sequencesEndpoint);
            if (!response.ok) {
                throw new Error('Failed to load sequences from API');
            }

            const data = await response.json();
            this.program = data.map((item, idx) => this.normalizeSequenceItem(item, idx));
            this.syncCurrentFlag();
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading program:', error);
            this.showMessage('Error loading program data', 'error');
        }
    }

    normalizeSequenceItem(item, idx) {
        return {
            order: (idx + 1).toString(),
            sequence: item.sequence || `Seq. ${idx + 1}`,
            title: item.title || 'Program Piece',
            actors: Array.isArray(item.actors) ? item.actors : [],
            details: {
                notes: item['costumes/notes'] || '',
                quickChange1: item['quick change1'] || '',
                quickChange2: item['quick change2'] || ''
            },
            is_current: this.currentProgramIndex !== '-1' && this.currentProgramIndex === (idx + 1).toString()
        };
    }

    syncCurrentFlag() {
        this.program.forEach((item) => {
            item.is_current = this.currentProgramIndex !== '-1' && item.order === this.currentProgramIndex;
        });
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

            programItem.innerHTML = `
                <div class="item-info">
                    <div class="item-performer">${item.sequence} - ${item.title}</div>
                    <div class="item-piece"><strong>Performers:</strong> ${this.formatActors(item.actors)}</div>
                    ${this.formatDetails(item.details)}
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
            await this.updateCurrentProgram(clickedItem.order);
        }
    }

    async clearAll() {
        await this.updateCurrentProgram('-1');
    }

    async updateCurrentProgram(programIndex) {
        try {
            if (API_CONFIG.useAPI) {
                const response = await fetch(API_CONFIG.currentProgramEndpoint, {
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

                const program = this.program.find(p => p.order === programIndex);
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
                    const program = this.program.find(p => p.order === programIndex);
                    this.showMessage(`Set "${program?.title}" as current program`, 'success');
                }
            }

            // Update the display
            this.syncCurrentFlag();
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
            this.syncCurrentFlag();
            this.updateDisplay();
        }
    }

    formatActors(actors) {
        if (!Array.isArray(actors) || actors.length === 0) {
            return 'To be announced';
        }
        return actors.join(', ');
    }

    formatDetails(details) {
        const rows = [];
        if (details.notes) {
            rows.push(`<div><strong>Costumes/Notes:</strong> ${details.notes}</div>`);
        }
        if (details.quickChange1) {
            rows.push(`<div><strong>Quick Change 1:</strong> ${details.quickChange1}</div>`);
        }
        if (details.quickChange2) {
            rows.push(`<div><strong>Quick Change 2:</strong> ${details.quickChange2}</div>`);
        }
        if (rows.length === 0) {
            return '';
        }
        return `<div class="item-details">${rows.join('')}</div>`;
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
