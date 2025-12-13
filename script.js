// API Configuration
const API_CONFIG = {
    currentProgramEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/current-program',
    sequencesEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/sequences',
    useAPI: true
};

class RecitalProgram {
    constructor() {
        this.program = [];
        this.currentIndex = -1;
        this.currentProgramIndex = '-1';
        this.setupDetailToggleListener();
        this.init();
    }

    setupDetailToggleListener() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.detail-toggle');
            if (!button) {
                return;
            }

            const targetId = button.getAttribute('data-target');
            const panel = document.getElementById(targetId);
            if (!panel) {
                return;
            }

            const isOpen = panel.classList.toggle('open');
            panel.style.maxHeight = isOpen ? `${panel.scrollHeight}px` : '0px';
            panel.setAttribute('aria-hidden', (!isOpen).toString());
            button.setAttribute('aria-expanded', isOpen.toString());
            button.textContent = isOpen ? 'Hide Details' : 'View Details';
        });
    }

    async init() {
        await this.loadProgram();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);

        // Listen for localStorage changes from admin panel (fallback)
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentProgramIndex') {
                this.checkForUpdates();
            }
        });

        // Poll for changes every 8 seconds
        setInterval(() => this.checkForUpdates(), 8000);
    }

    async checkForUpdates() {
        try {
            let newProgramIndex = '-1';

            if (API_CONFIG.useAPI) {
                const response = await fetch(API_CONFIG.currentProgramEndpoint);
                if (response.ok) {
                    const data = await response.json();
                    newProgramIndex = data.currentProgramIndex || '-1';
                } else {
                    console.warn('[Program] Current program endpoint returned non-OK response:', response.status);
                    throw new Error('API not available');
                }
            } else {
                newProgramIndex = localStorage.getItem('currentProgramIndex') || '-1';
            }

            if (newProgramIndex !== this.currentProgramIndex) {
                this.currentProgramIndex = newProgramIndex;
                await this.loadProgram();
            }
        } catch (error) {
            console.error('[Program] Unable to reach current program endpoint, using localStorage fallback.', error);
            const localStorageIndex = localStorage.getItem('currentProgramIndex') || '-1';
            if (localStorageIndex !== this.currentProgramIndex) {
                this.currentProgramIndex = localStorageIndex;
                await this.loadProgram();
            }
        }
    }

    async loadProgram() {
        try {
            await this.ensureCurrentProgramIndex();
            await this.loadProgramFromAPI();
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading program from API:', error);
            this.program = [];
            this.currentIndex = -1;
            this.updateDisplay();
        }
    }

    async ensureCurrentProgramIndex() {
        if (this.currentProgramIndex !== '-1') {
            return;
        }

        try {
            if (API_CONFIG.useAPI) {
                const response = await fetch(API_CONFIG.currentProgramEndpoint);
                if (response.ok) {
                    const data = await response.json();
                    this.currentProgramIndex = data.currentProgramIndex || '-1';
                } else {
                    throw new Error('Current program endpoint unavailable');
                }
            } else {
                this.currentProgramIndex = localStorage.getItem('currentProgramIndex') || '-1';
            }
        } catch (error) {
            console.warn('Falling back to localStorage for current program index.', error);
            this.currentProgramIndex = localStorage.getItem('currentProgramIndex') || '-1';
        }
    }

    async loadProgramFromAPI() {
        const response = await fetch(API_CONFIG.sequencesEndpoint);
        if (!response.ok) {
            throw new Error(`Failed to fetch sequences from API (status ${response.status})`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Unexpected sequences payload');
        }

        this.program = data.map((item, idx) => this.normalizeSequenceItem(item, idx));
        this.setCurrentIndex();
    }

    normalizeSequenceItem(item, idx) {
        const detailEntries = [];
        if (item['costumes/notes']) {
            detailEntries.push({
                label: 'Costumes / Notes',
                value: item['costumes/notes']
            });
        }
        if (item['quick change1']) {
            detailEntries.push({
                label: 'Quick Change 1',
                value: item['quick change1']
            });
        }
        if (item['quick change2']) {
            detailEntries.push({
                label: 'Quick Change 2',
                value: item['quick change2']
            });
        }

        return {
            order: (idx + 1).toString(),
            sequence: item.sequence || `Seq. ${idx + 1}`,
            title: item.title || 'Program Piece',
            actors: Array.isArray(item.actors) ? item.actors : [],
            details: detailEntries
        };
    }

    setCurrentIndex() {
        if (this.program.length === 0 || this.currentProgramIndex === '-1') {
            this.currentIndex = -1;
            return;
        }

        this.currentIndex = this.program.findIndex((item) => item.order === this.currentProgramIndex);
    }

    updateDateTime() {
        document.getElementById('dateTime').textContent = 'December 14, Sunday';
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
        const detailMarkup = this.getDetailMarkup(current, 'current', this.currentIndex);
        currentItem.innerHTML = `
            <div class="program-number">
                ${current.sequence}
                <span class="program-count">${this.currentIndex + 1} of ${this.program.length}</span>
            </div>
            <div class="performer-name">${current.title}</div>
            <div class="actors-list"><strong>Performers:</strong> ${this.formatActors(current.actors)}</div>
            ${detailMarkup}
            <div class="status-indicator playing"></div>
        `;
    }

    updateNextPerformance() {
        const nextItem = document.getElementById('nextItem');
        const nextIndex = this.currentIndex + 1;

        if (this.program.length === 0) {
            nextItem.innerHTML = `
                <div class="performer-name">Loading...</div>
                <div class="piece-info">Please wait</div>
            `;
            return;
        }

        if (this.currentIndex === -1) {
            const first = this.program[0];
            const detailMarkup = this.getDetailMarkup(first, 'next', 0);
            nextItem.innerHTML = `
                <div class="program-number-small">
                    ${first.sequence}
                    <span class="program-count">1 of ${this.program.length}</span>
                </div>
                <div class="performer-name">${first.title}</div>
                <div class="actors-list"><strong>Performers:</strong> ${this.formatActors(first.actors)}</div>
                ${detailMarkup}
            `;
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
        const detailMarkup = this.getDetailMarkup(next, 'next', nextIndex);
        nextItem.innerHTML = `
            <div class="program-number-small">
                ${next.sequence}
                <span class="program-count">${nextIndex + 1} of ${this.program.length}</span>
            </div>
            <div class="performer-name">${next.title}</div>
            <div class="actors-list"><strong>Performers:</strong> ${this.formatActors(next.actors)}</div>
            ${detailMarkup}
        `;
    }

    updateProgramList() {
        const programItems = document.getElementById('programItems');
        programItems.innerHTML = '';

        if (this.program.length === 0) {
            programItems.innerHTML = `
                <div class="program-item empty">
                    <div class="item-info">
                        <div class="item-performer">No program data available</div>
                        <div class="item-piece">Please check back later.</div>
                    </div>
                </div>
            `;
            return;
        }

        this.program.forEach((item, index) => {
            const programItem = document.createElement('div');
            programItem.className = 'program-item';

            let status = 'upcoming';
            let statusText = 'Upcoming';

            if (this.currentIndex !== -1 && index < this.currentIndex) {
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

            const detailMarkup = this.getDetailMarkup(item, 'list', index);
            programItem.innerHTML = `
                <div class="item-number">
                    <div>${item.sequence}</div>
                    <small>${index + 1} of ${this.program.length}</small>
                </div>
                <div class="item-info">
                    <div class="item-performer">${item.title}</div>
                    <div class="item-actors"><strong>Performers:</strong> ${this.formatActors(item.actors)}</div>
                    ${detailMarkup}
                </div>
                <div class="item-status ${status}">${statusText}</div>
            `;

            programItems.appendChild(programItem);
        });
    }

    formatActors(actors) {
        if (!Array.isArray(actors) || actors.length === 0) {
            return 'To be announced';
        }
        return actors.join(', ');
    }

    getDetailMarkup(item, context, index) {
        const details = Array.isArray(item.details) ? item.details : [];
        if (details.length === 0) {
            return '';
        }

        const detailId = `${context}-details-${index}`;
        const rows = details.map((detail) => `
            <div class="detail-row">
                <span class="detail-label">${detail.label}</span>
                <div class="detail-value">${this.formatDetailValue(detail.value)}</div>
            </div>
        `).join('');

        return `
            <button class="detail-toggle" type="button" aria-expanded="false" aria-controls="${detailId}" data-target="${detailId}">
                View Details
            </button>
            <div class="detail-panel" id="${detailId}" aria-hidden="true">
                ${rows}
            </div>
        `;
    }

    formatDetailValue(value) {
        if (!value) {
            return '';
        }
        return value.replace(/\\r?\\n/g, '<br>');
    }
}

// Initialize the program when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.recitalProgram = new RecitalProgram();
});
