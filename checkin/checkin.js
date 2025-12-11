const CHECKIN_API = {
    statusEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/sba/checkin-status',
    updateEndpoint: 'https://ln686uub5b.execute-api.us-east-1.amazonaws.com/prod/sba/checkin-update'
};

class CheckinPage {
    constructor() {
        this.actors = [];
        this.filteredActors = [];
        this.isLoading = false;
        this.currentQuery = '';
        this.listEl = document.getElementById('checkinList');
        this.messageEl = document.getElementById('checkinStatusMessage');
        this.searchInput = document.getElementById('checkinSearch');
        this.refreshBtn = document.getElementById('refreshCheckin');
        this.activeRequests = new Set();

        this.attachEvents();
        this.fetchStatus();
    }

    attachEvents() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (event) => {
                const value = event.target.value.trim().toLowerCase();
                this.filterByName(value);
            });
        }

        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.fetchStatus());
        }
    }

    async fetchStatus(showLoadingMessage = true) {
        try {
            this.isLoading = true;
            if (showLoadingMessage) {
                this.setAlert('Loading performers…', 'info');
            }
            const response = await fetch(CHECKIN_API.statusEndpoint);
            if (!response.ok) {
                throw new Error(`Unable to load performers (status ${response.status})`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Unexpected response format from check-in API');
            }

            this.actors = data.map((actor) => this.normalizeActor(actor));
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

    normalizeActor(actor) {
        return {
            name: actor.name || 'Unnamed Performer',
            age: actor.age || '—',
            cafeteria_group: actor.cafeteria_group || '—',
            quick_change: actor.quick_change || '',
            other_special_instructions: actor.other_special_instructions || actor.other_instructions || '',
            check_in: Boolean(actor.check_in),
            check_out: Boolean(actor.check_out)
        };
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

        card.innerHTML = `
            <div class="checkin-card-header">
                <h2 class="checkin-name">${actor.name}</h2>
                <div class="checkin-tags">
                    <span class="checkin-tag ${actor.check_in ? 'tag-success' : ''}">Check In: ${actor.check_in ? 'Yes' : 'No'}</span>
                    <span class="checkin-tag ${actor.check_out ? 'tag-success' : ''}">Check Out: ${actor.check_out ? 'Yes' : 'No'}</span>
                </div>
            </div>
            <dl class="checkin-details">
                ${detailItems}
            </dl>
            <div class="checkin-actions">
                <button class="checkin-btn ${actor.check_in ? 'active' : ''}" data-action="check_in" aria-pressed="${actor.check_in}">
                    ${this.buildButtonLabel(actor.check_in, actor.check_in ? 'Checked In' : 'Check In')}
                </button>
                <button class="checkin-btn secondary ${actor.check_out ? 'active' : ''}" data-action="check_out" aria-pressed="${actor.check_out}">
                    ${this.buildButtonLabel(actor.check_out, actor.check_out ? 'Checked Out' : 'Check Out')}
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
                <dt>${label}</dt>
                <dd>${value}</dd>
            </div>
        `;
    }

    buildButtonLabel(isChecked, label) {
        return `
            <span class="checkin-checkbox ${isChecked ? 'checked' : ''}" aria-hidden="true">
                <span class="checkin-checkmark">&#10003;</span>
            </span>
            <span class="checkin-btn-label">${label}</span>
        `;
    }

    async handleAction(actor, action, button) {
        if (!action) {
            return;
        }

        const key = `${actor.name}:${action}`;
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
            this.setAlert(`${actor.name} ${isCheckInAction ? 'check-in' : 'check-out'} updated.`, 'success');
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
            name: actorPayload.name
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

        // Some backends might not return JSON. Attempt to parse but ignore errors.
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
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('checkinList')) {
        new CheckinPage();
    }
});
