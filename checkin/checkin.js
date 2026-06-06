const CHECKIN_API = {
    statusEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/sba/checkin-status',
    updateEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/sba/checkin-update'
};

const CHECKIN_DAYS = ['saturday', 'sunday'];
const CHECKIN_DAY_LABELS = {
    saturday: 'Saturday',
    sunday: 'Sunday'
};

class CheckinPage {
    constructor() {
        this.rawActors = [];
        this.actors = [];
        this.filteredActors = [];
        this.isLoading = false;
        this.currentQuery = '';
        this.currentDay = this.loadSavedDay();
        this.listEl = document.getElementById('checkinList');
        this.messageEl = document.getElementById('checkinStatusMessage');
        this.searchInput = document.getElementById('checkinSearch');
        this.daySelect = document.getElementById('checkinDay');
        this.refreshBtn = document.getElementById('refreshCheckin');
        this.activeRequests = new Set();

        this.attachEvents();
        this.syncDayControl();
        this.fetchStatus();
    }

    loadSavedDay() {
        const savedDay = localStorage.getItem('sbaCheckinDay');
        return CHECKIN_DAYS.includes(savedDay) ? savedDay : 'saturday';
    }

    attachEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (event) => {
                const value = event.target.value.trim().toLowerCase();
                this.filterByName(value);
            });
        }

        if (this.daySelect) {
            this.daySelect.addEventListener('change', (event) => {
                this.updateCurrentDay(event.target.value);
            });
        }

        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.fetchStatus());
        }
    }

    syncDayControl() {
        if (this.daySelect) {
            this.daySelect.value = this.currentDay;
        }
    }

    updateCurrentDay(day) {
        if (!CHECKIN_DAYS.includes(day) || day === this.currentDay) {
            return;
        }

        this.currentDay = day;
        localStorage.setItem('sbaCheckinDay', day);
        this.rebuildActorsForCurrentDay();
        this.applySearchFilter();
        this.renderList(this.currentQuery);
        this.setAlert(`Showing ${this.getDayLabel(day)} check-in status.`, 'info');
    }

    async fetchStatus(showLoadingMessage = true) {
        try {
            this.isLoading = true;
            if (showLoadingMessage) {
                this.setAlert(`Loading ${this.getDayLabel(this.currentDay)} performers…`, 'info');
            }
            const response = await fetch(CHECKIN_API.statusEndpoint);
            if (!response.ok) {
                throw new Error(`Unable to load performers (status ${response.status})`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Unexpected response format from check-in API');
            }

            this.rawActors = data;
            this.rebuildActorsForCurrentDay();
            this.applySearchFilter();
            this.renderList(this.currentQuery);
            if (showLoadingMessage) {
                this.clearAlert();
            }
        } catch (error) {
            console.error('Failed to fetch check-in status', error);
            this.setAlert('Sorry, we could not load the check-in list. Please try again.', 'error');
            this.renderFallbackState();
        } finally {
            this.isLoading = false;
        }
    }

    rebuildActorsForCurrentDay() {
        this.actors = this.rawActors.map((actor) => this.normalizeActor(actor));
    }

    normalizeActor(actor) {
        const statuses = this.buildStatuses(actor);
        const currentStatus = statuses[this.currentDay];

        return {
            name: actor.name || 'Unnamed Performer',
            age: actor.age || '—',
            cafeteria_group: actor.cafeteria_group || '—',
            quick_change: actor.quick_change || '',
            other_special_instructions: actor.other_special_instructions || actor.other_instructions || '',
            statuses,
            check_in: currentStatus.check_in,
            check_out: currentStatus.check_out
        };
    }

    buildStatuses(actor) {
        return CHECKIN_DAYS.reduce((statuses, day) => {
            statuses[day] = {
                check_in: this.toBoolean(actor[`check_in_${day}`] ?? actor.check_in),
                check_out: this.toBoolean(actor[`check_out_${day}`] ?? actor.check_out)
            };
            return statuses;
        }, {});
    }

    toBoolean(value) {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            return ['true', 'yes', 'y', '1', 'checked'].includes(value.trim().toLowerCase());
        }

        return Boolean(value);
    }

    filterByName(query) {
        const normalizedQuery = (query || '').trim().toLowerCase();
        this.currentQuery = normalizedQuery;
        this.applySearchFilter();
        this.renderList(normalizedQuery);
    }

    applySearchFilter() {
        if (!this.currentQuery) {
            this.filteredActors = [...this.actors];
            return;
        }

        this.filteredActors = this.actors.filter((actor) =>
            actor.name.toLowerCase().includes(this.currentQuery)
        );
    }

    renderFallbackState() {
        if (!this.listEl) {
            return;
        }

        if (this.actors.length === 0) {
            this.listEl.innerHTML = '<div class="checkin-empty">No performers to show.</div>';
        } else {
            this.renderList(this.currentQuery);
        }
    }

    renderList(query = this.currentQuery) {
        if (!this.listEl) {
            return;
        }

        if (this.filteredActors.length === 0) {
            const message = query ? 'No performers match your search.' : 'No performers available.';
            this.listEl.innerHTML = `<div class="checkin-empty">${message}</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.filteredActors.forEach((actor) => {
            fragment.appendChild(this.createActorCard(actor));
        });

        this.listEl.innerHTML = '';
        this.listEl.appendChild(fragment);
    }

    createActorCard(actor) {
        const card = document.createElement('article');
        card.className = 'checkin-card';
        card.setAttribute('data-name', actor.name);

        const detailItems = this.buildDetailList(actor);
        const dayLabel = this.getDayLabel(this.currentDay);

        card.innerHTML = `
            <div class="checkin-card-header">
                <h2 class="checkin-name">${this.escapeHtml(actor.name)}</h2>
                <div class="checkin-tags">
                    <span class="checkin-tag">${dayLabel}</span>
                    <span class="checkin-tag ${actor.check_in ? 'tag-success' : ''}">In: ${actor.check_in ? 'Yes' : 'No'}</span>
                    <span class="checkin-tag ${actor.check_out ? 'tag-success' : ''}">Out: ${actor.check_out ? 'Yes' : 'No'}</span>
                </div>
            </div>
            <dl class="checkin-details">
                ${detailItems}
            </dl>
            <div class="checkin-actions">
                <button class="checkin-btn ${actor.check_in ? 'active' : ''}" data-action="check_in" aria-pressed="${actor.check_in}">
                    ${this.buildButtonLabel(actor.check_in, actor.check_in ? `Checked In ${dayLabel}` : `Check In ${dayLabel}`)}
                </button>
                <button class="checkin-btn secondary ${actor.check_out ? 'active' : ''}" data-action="check_out" aria-pressed="${actor.check_out}">
                    ${this.buildButtonLabel(actor.check_out, actor.check_out ? `Checked Out ${dayLabel}` : `Check Out ${dayLabel}`)}
                </button>
            </div>
        `;

        card.querySelectorAll('.checkin-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                this.handleAction(actor, action, button);
            });
        });

        return card;
    }

    buildDetailList(actor) {
        const rows = [];
        rows.push(this.detailRow('Age', actor.age));
        rows.push(this.detailRow('Cafeteria Group', actor.cafeteria_group));

        if (actor.quick_change) {
            rows.push(this.detailRow('Quick Change', actor.quick_change));
        }

        if (actor.other_special_instructions) {
            rows.push(this.detailRow('Special Instructions', actor.other_special_instructions));
        }

        return rows.join('');
    }

    detailRow(label, value) {
        return `
            <div class="checkin-detail-row">
                <dt>${this.escapeHtml(label)}</dt>
                <dd>${this.escapeHtml(value)}</dd>
            </div>
        `;
    }

    buildButtonLabel(isChecked, label) {
        return `
            <span class="checkin-checkbox ${isChecked ? 'checked' : ''}" aria-hidden="true">
                <span class="checkin-checkmark">&#10003;</span>
            </span>
            <span class="checkin-btn-label">${this.escapeHtml(label)}</span>
        `;
    }

    async handleAction(actor, action, button) {
        if (!action) {
            return;
        }

        const key = `${actor.name}:${this.currentDay}:${action}`;
        if (this.activeRequests.has(key)) {
            return;
        }

        const isCheckInAction = action === 'check_in';
        const updatedActor = {
            ...actor,
            check_in: isCheckInAction ? !actor.check_in : actor.check_in,
            check_out: !isCheckInAction ? !actor.check_out : actor.check_out
        };

        this.activeRequests.add(key);
        this.toggleButtonLoading(button, true);

        try {
            await this.sendUpdate(updatedActor, action);
            await this.fetchStatus(false);
            this.setAlert(`${actor.name} ${this.getDayLabel(this.currentDay)} ${isCheckInAction ? 'check-in' : 'check-out'} updated.`, 'success');
        } catch (error) {
            console.error('Unable to update performer status', error);
            this.setAlert('Update failed. Please try again.', 'error');
        } finally {
            this.activeRequests.delete(key);
            this.toggleButtonLoading(button, false);
        }
    }

    async sendUpdate(actorPayload, action) {
        const payload = {
            name: actorPayload.name,
            day: this.currentDay
        };

        const numericAge = Number(actorPayload.age);
        if (!Number.isNaN(numericAge)) {
            payload.age = numericAge;
        }

        if (action === 'check_in') {
            payload.check_in = actorPayload.check_in;
        } else if (action === 'check_out') {
            payload.check_out = actorPayload.check_out;
        }

        const response = await fetch(CHECKIN_API.updateEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Update failed with status ${response.status}`);
        }

        try {
            const result = await response.json();
            if (result && result.name) {
                return this.normalizeActor(result);
            }
        } catch (error) {
            // Response had no JSON body, ignore.
        }

        return this.normalizeActor(actorPayload);
    }

    toggleButtonLoading(button, isLoading) {
        if (!button) {
            return;
        }

        if (isLoading) {
            button.classList.add('loading');
            button.setAttribute('aria-busy', 'true');
        } else {
            button.classList.remove('loading');
            button.removeAttribute('aria-busy');
        }
    }

    setAlert(message, type = 'info') {
        if (!this.messageEl) {
            return;
        }

        this.messageEl.textContent = message;
        this.messageEl.className = `checkin-alert ${type}`;
    }

    clearAlert() {
        if (!this.messageEl) {
            return;
        }

        this.messageEl.textContent = '';
        this.messageEl.className = 'checkin-alert';
    }

    getDayLabel(day) {
        return CHECKIN_DAY_LABELS[day] || day;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('checkinList')) {
        new CheckinPage();
    }
});
