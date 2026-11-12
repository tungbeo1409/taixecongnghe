/* Bonus-program experience matching the detailed progress UI. Loaded by sw.js after index.html. */
(() => {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    const normalizeMilestone = (milestone = {}) => {
        const trips = Number(milestone.trips ?? milestone.count) || 0;
        let bonus = milestone.bonus;
        if (bonus === undefined || bonus === null) {
            bonus = Number(String(milestone.reward ?? '').replace(/[^\d.-]/g, '')) || 0;
        }
        return { trips, bonus: Number(bonus) || 0 };
    };

    const formatMoney = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;

    function setBonusMilestoneRow(trips = '', bonus = '', removable = true) {
        const row = document.createElement('div');
        row.className = 'milestone-row flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200';
        row.innerHTML = `
            <div class="flex-1">
                <label class="text-[10px] font-bold text-slate-500 block">Số cuốc</label>
                <input type="number" min="1" step="1" value="${escapeHtml(trips)}" placeholder="Số cuốc" class="m-trips w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs">
            </div>
            <div class="flex-1">
                <label class="text-[10px] font-bold text-slate-500 block">Thưởng (VNĐ)</label>
                <input type="number" min="0" step="5000" value="${escapeHtml(bonus)}" placeholder="Số tiền thưởng" class="m-bonus w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs">
            </div>
            ${removable ? '<button type="button" aria-label="Xóa mốc" class="remove-milestone text-slate-400 hover:text-rose-600 p-2 mt-3"><i class="fa-solid fa-trash text-xs"></i></button>' : ''}
        `;
        const removeButton = row.querySelector('.remove-milestone');
        if (removeButton) removeButton.addEventListener('click', () => row.remove());
        return row;
    }

    window.openAddBonusModal = function (programIndex = null) {
        const isEditing = programIndex !== null && programIndex !== undefined;
        window.editingBonusId = isEditing ? Number(programIndex) : null;
        const program = isEditing ? (state.bonusPrograms || [])[Number(programIndex)] : null;
        if (isEditing && !program) return;

        document.getElementById('bonusModalTitle').innerHTML = isEditing
            ? '<i class="fa-solid fa-pen-to-square text-amber-500"></i> Sửa chương trình thưởng'
            : '<i class="fa-solid fa-gift text-amber-500"></i> Tạo chương trình thưởng';
        document.getElementById('bonusModalSaveBtn').textContent = isEditing ? 'Lưu thay đổi' : 'Tạo chương trình';
        document.getElementById('inputBonusTitle').value = program?.title || 'beBike - Thưởng Cuối Tuần';
        document.getElementById('inputBonusType').value = program?.type || 'Thưởng tuần';
        document.getElementById('inputReqAccept').value = program?.reqAccept ?? 90;
        document.getElementById('inputReqCancel').value = program?.reqCancel ?? 10;

        const container = document.getElementById('milestonesInputsContainer');
        container.replaceChildren();
        const milestones = (program?.milestones || []).map(normalizeMilestone);
        if (milestones.length) {
            milestones.forEach((milestone) => container.appendChild(setBonusMilestoneRow(milestone.trips, milestone.bonus)));
        } else if (isEditing) {
            container.appendChild(setBonusMilestoneRow());
        } else {
            container.appendChild(setBonusMilestoneRow(3, 10000));
            container.appendChild(setBonusMilestoneRow(6, 25000));
        }
        const modal = document.getElementById('bonusModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeAddBonusModal = function () {
        const modal = document.getElementById('bonusModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        window.editingBonusId = null;
    };

    window.addMilestoneRow = function () {
        const rows = [...document.querySelectorAll('#milestonesInputsContainer .milestone-row')];
        const lastTrips = Number(rows.at(-1)?.querySelector('.m-trips')?.value) || 0;
        document.getElementById('milestonesInputsContainer').appendChild(setBonusMilestoneRow(lastTrips + 3, 50000));
    };

    window.deleteBonusProgram = function (index) {
        if (!Array.isArray(state.bonusPrograms)) state.bonusPrograms = [];
        state.bonusPrograms.splice(index, 1);
        saveState();
        renderBonusPrograms();
        showToast('Đã xóa chương trình thưởng');
    };

    window.saveBonusProgram = function () {
        const title = document.getElementById('inputBonusTitle').value.trim();
        const type = document.getElementById('inputBonusType').value || 'Thưởng ngày';
        const reqAccept = Number(document.getElementById('inputReqAccept').value);
        const reqCancel = Number(document.getElementById('inputReqCancel').value);
        const rows = [...document.querySelectorAll('#milestonesInputsContainer .milestone-row')];
        const milestones = rows.map((row) => ({
            trips: Number(row.querySelector('.m-trips')?.value),
            bonus: Number(row.querySelector('.m-bonus')?.value)
        })).filter((milestone) => Number.isInteger(milestone.trips) && milestone.trips > 0 && Number.isFinite(milestone.bonus) && milestone.bonus >= 0);

        if (!title) return showToast('Vui lòng nhập tên chương trình');
        if (!Number.isFinite(reqAccept) || reqAccept < 0 || reqAccept > 100 || !Number.isFinite(reqCancel) || reqCancel < 0 || reqCancel > 100) {
            return showToast('Tỉ lệ phải nằm trong khoảng 0–100%');
        }
        if (!milestones.length) return showToast('Vui lòng thêm ít nhất 1 mốc thưởng hợp lệ!');
        milestones.sort((a, b) => a.trips - b.trips);
        for (let i = 1; i < milestones.length; i++) {
            if (milestones[i].trips <= milestones[i - 1].trips) {
                return showToast('Lỗi: Số cuốc mốc sau phải lớn hơn mốc trước!');
            }
        }

        const wasEditing = window.editingBonusId !== null && window.editingBonusId !== undefined;
        const program = { title, type, milestones, reqAccept, reqCancel };
        if (!Array.isArray(state.bonusPrograms)) state.bonusPrograms = [];
        if (wasEditing && state.bonusPrograms[window.editingBonusId]) {
            state.bonusPrograms[window.editingBonusId] = program;
        } else {
            state.bonusPrograms.push(program);
        }
        saveState();
        closeAddBonusModal();
        renderBonusPrograms();
        showToast(wasEditing ? 'Đã cập nhật chương trình thưởng' : 'Đã thêm chương trình thưởng mới');
    };

    window.renderBonusPrograms = function () {
        const container = document.getElementById('bonusProgramsContainer');
        if (!container) return;
        if (!Array.isArray(state.bonusPrograms)) state.bonusPrograms = [];
        if (!state.bonusPrograms.length) {
            container.innerHTML = `
                <div class="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                    <i class="fa-solid fa-gift text-2xl mb-2 text-slate-300"></i>
                    <p class="text-xs font-bold">Chưa có chương trình thưởng nào.</p>
                </div>`;
            return;
        }

        const completedTrips = Number(state.completed) || 0;
        const incoming = (Number(state.ignored) || 0) + completedTrips + (Number(state.customerCancel) || 0) + (Number(state.driverCancel) || 0);
        const acceptedTrips = incoming - (Number(state.ignored) || 0);
        const rawAccept = incoming > 0 ? acceptedTrips / incoming * 100 : 100;
        const rawCancel = acceptedTrips > 0 ? (Number(state.driverCancel) || 0) / acceptedTrips * 100 : 0;
        const shownAccept = state.roundingEnabled ? Math.ceil(rawAccept) : Math.round(rawAccept);
        const shownCancel = state.roundingEnabled ? Math.ceil(rawCancel) : Math.round(rawCancel);
        const escaped = escapeHtml;

        container.innerHTML = state.bonusPrograms.map((program, index) => {
            const milestones = (program.milestones || []).map(normalizeMilestone).filter((m) => m.trips > 0).sort((a, b) => a.trips - b.trips);
            if (!milestones.length) return '';
            const maxTrips = milestones[milestones.length - 1].trips;
            const nextMilestone = milestones.find((milestone) => completedTrips < milestone.trips);
            const targetTrips = nextMilestone ? nextMilestone.trips : maxTrips;
            const progressPct = Math.max(0, Math.min(100, completedTrips / maxTrips * 100));
            const acceptReq = Math.max(0, Math.min(100, Number(program.reqAccept) || 0));
            const cancelReq = Math.max(0, Math.min(100, Number(program.reqCancel) || 0));
            const acceptValid = shownAccept >= acceptReq;
            const cancelValid = shownCancel <= cancelReq;
            let progressStatus = 'Đã hoàn thành tất cả mốc thưởng! 🎉';
            let advice = '';

            if (nextMilestone) {
                const remaining = nextMilestone.trips - completedTrips;
                const minutes = Math.round(remaining / 3 * 60);
                const finish = new Date(Date.now() + minutes * 60000);
                const timeText = minutes >= 60
                    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}p` : ''}`
                    : `${minutes}p`;
                progressStatus = `Còn <strong class="font-black text-slate-900">${remaining}</strong> cuốc để đạt mốc <strong class="font-black text-slate-900">${formatMoney(nextMilestone.bonus)}</strong> (<strong class="font-black">${timeText}</strong> - dự kiến hoàn thành lúc <strong class="font-black">${String(finish.getHours()).padStart(2, '0')}h${String(finish.getMinutes()).padStart(2, '0')}</strong>)`;
            }

            let needed = 0;
            if (!acceptValid && acceptReq < 100) {
                needed = Math.ceil((acceptReq / 100 * incoming - acceptedTrips) / (1 - acceptReq / 100));
            } else if (!acceptValid && acceptReq >= 100) {
                needed = Number.POSITIVE_INFINITY;
            } else if (!cancelValid && cancelReq > 0) {
                needed = Math.ceil((Number(state.driverCancel || 0) / (cancelReq / 100)) - acceptedTrips);
            } else if (!cancelValid && cancelReq === 0 && Number(state.driverCancel || 0) > 0) {
                needed = Number.POSITIVE_INFINITY;
            }
            if (needed > 0 && Number.isFinite(needed)) {
                const minutes = Math.round(needed / 3 * 60);
                const finish = new Date(Date.now() + minutes * 60000);
                const timeText = minutes >= 60
                    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? `${minutes % 60}p` : ''}`
                    : `${minutes}p`;
                advice = `Cố gắng chạy thêm <strong class="font-black text-slate-900">${needed}</strong> cuốc không hủy để đủ tỉ lệ nhận thưởng (<strong class="font-black">${timeText}</strong> - dự kiến hoàn thành lúc <strong class="font-black">${String(finish.getHours()).padStart(2, '0')}h${String(finish.getMinutes()).padStart(2, '0')}</strong>)`;
            } else if (needed === Number.POSITIVE_INFINITY) {
                advice = 'Không thể đạt điều kiện tỉ lệ hiện tại chỉ bằng cách chạy thêm cuốc; hãy kiểm tra lại số liệu hoặc điều kiện thưởng.';
            }

            return `
                <div class="bg-white border border-slate-200 shadow-xs rounded-2xl p-4 space-y-3.5">
                    <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">${escaped(program.type || 'Thưởng ngày')}</span>
                            <h4 class="text-xs font-black text-slate-900 mt-1">${escaped(program.title || 'Chương trình thưởng')}</h4>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="openAddBonusModal(${index})" aria-label="Sửa chương trình" class="text-slate-400 hover:text-amber-600 p-1"><i class="fa-solid fa-pen-to-square text-xs"></i></button>
                            <button onclick="deleteBonusProgram(${index})" aria-label="Xóa chương trình" class="text-slate-400 hover:text-rose-600 p-1"><i class="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                    </div>
                    <div class="pt-6 pb-6 px-2">
                        <div class="ml-2 mr-4 relative bg-slate-100 h-2.5 rounded-full overflow-visible">
                            <div class="bg-emerald-500 h-full rounded-full transition-all duration-300" style="width:${progressPct}%"></div>
                            ${!milestones.some((m) => m.trips === completedTrips) ? `<div class="absolute -top-7 -translate-x-1/2 flex flex-col items-center z-20" style="left:${progressPct}%"><div class="relative w-6 h-7 bg-white border-2 border-slate-900 rounded-t-full rounded-b-full flex items-center justify-center text-slate-900 text-[10px] font-black shadow-md"><span class="relative z-10 -top-0.5">${completedTrips}</span><div class="absolute -bottom-1 w-2 h-2 bg-slate-900 rotate-45"></div></div></div>` : ''}
                            ${milestones.map((milestone) => {
                                const reached = completedTrips >= milestone.trips;
                                const pct = Math.min(100, milestone.trips / maxTrips * 100);
                                const reward = milestone.bonus >= 1000 ? `${milestone.bonus / 1000}K` : milestone.bonus;
                                return `<div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10" style="left:${pct}%"><div class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shadow-xs border-2 transition-all ${reached ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-700'}">${milestone.trips}</div><div class="absolute top-7 whitespace-nowrap text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs border ${reached ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-700 border-slate-200'}">${escaped(reward)}</div></div>`;
                            }).join('')}
                        </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-semibold text-slate-700">${progressStatus}</div>
                    <div class="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                        <div class="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-700"><span class="flex items-center gap-1.5"><i class="fa-solid fa-hand-holding-hand text-blue-500"></i> Nhận chuyến</span><div class="flex items-center gap-3"><span class="text-slate-500">&gt;=${acceptReq}%</span><span class="font-black ${acceptValid ? 'text-emerald-600' : 'text-rose-600'}">${shownAccept}% ${acceptValid ? '✓' : '✕'}</span></div></div>
                        <div class="flex items-center justify-between px-3 py-2.5 bg-white font-bold text-slate-700"><span class="flex items-center gap-1.5"><i class="fa-solid fa-ban text-rose-500"></i> Hủy chuyến</span><div class="flex items-center gap-3"><span class="text-slate-500">&lt;=${cancelReq}%</span><span class="font-black ${cancelValid ? 'text-emerald-600' : 'text-rose-600'}">${shownCancel}% ${cancelValid ? '✓' : '✕'}</span></div></div>
                    </div>
                    ${advice ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs font-semibold text-amber-800 flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation text-amber-500"></i><div>${advice}</div></div>` : ''}
                </div>`;
        }).join('');
    };

    // Redraw after the app's original startup render so existing saved programs use the new layout.
    if (typeof window.renderBonusPrograms === 'function') window.renderBonusPrograms();
})();
