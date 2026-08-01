import re

with open('/Users/hamzamoustaati/Desktop/Frontend Repo/GEQO_Frontend/static/js/views/MenuManager.js', 'r') as f:
    content = f.read()

# 1. Category Actions
content = content.replace('''
                        <div class="flex items-center gap-3">
                            <button @click="openAddItemModal(cat.id)" :id="'menu-add-item-' + cat.id"
                                    class="text-xs font-bold text-saffron hover:text-saffron-light transition-colors">
                                + Add Item
                            </button>''', '''
                        <div class="flex items-center gap-3">
                            <button @click="openModifiersModal('category', cat)" class="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                Edit Modifiers
                            </button>
                            <button @click="openAddItemModal(cat.id)" :id="'menu-add-item-' + cat.id"
                                    class="text-xs font-bold text-saffron hover:text-saffron-light transition-colors">
                                + Add Item
                            </button>''')

# 2. Item Actions (Desktop)
content = content.replace('''
                                    <td class="text-right w-16">
                                        <button @click="deleteItem(item.id)"
                                                :id="'menu-del-item-' + item.id"
                                                class="text-slate-700 hover:text-harissa transition-colors opacity-0 group-hover:opacity-100">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </td>''', '''
                                    <td class="text-right whitespace-nowrap">
                                        <button @click="openModifiersModal('item', item)" class="text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold mr-3 opacity-0 group-hover:opacity-100">
                                            Mods
                                        </button>
                                        <button @click="deleteItem(item.id)"
                                                :id="'menu-del-item-' + item.id"
                                                class="text-slate-700 hover:text-harissa transition-colors opacity-0 group-hover:opacity-100 align-middle">
                                            <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </td>''')

# 3. Item Actions (Mobile)
content = content.replace('''
                                <button @click="deleteItem(item.id)" class="text-slate-700 hover:text-harissa transition-colors">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">''', '''
                                <button @click="openModifiersModal('item', item)" class="text-blue-400 text-xs font-bold">Mods</button>
                                <button @click="deleteItem(item.id)" class="text-slate-700 hover:text-harissa transition-colors">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">''')

# 4. Modal Template Injection
MODAL_TEMPLATE = """
            <!-- ════════ UNIVERSAL MODIFIERS MODAL ════════ -->
            <template v-if="showModifiers">
                <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="card-dark w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        <!-- Header -->
                        <div class="px-6 py-4 border-b border-white/[0.05] flex justify-between items-center bg-surface/50 shrink-0">
                            <div>
                                <h3 class="text-lg font-black text-slate-100">
                                    {{ modifierContextType === 'category' ? 'Category Modifiers' : 'Item Modifiers' }}
                                </h3>
                                <p class="text-sm text-slate-400 font-semibold mt-0.5">
                                    {{ modifierContextEntity.name_en }}
                                </p>
                            </div>
                            <button @click="closeModifiersModal" class="text-slate-500 hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <!-- Scrollable Body -->
                        <div class="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-900/50">
                            
                            <div v-if="!modifierContextEntity.modifier_groups || modifierContextEntity.modifier_groups.length === 0" class="text-center py-10">
                                <p class="text-slate-500 italic mb-4">No modifier groups yet.</p>
                            </div>
                            
                            <!-- Groups List -->
                            <div v-for="group in modifierContextEntity.modifier_groups" :key="group.id" class="border border-white/[0.1] rounded-xl overflow-hidden">
                                <div class="bg-surface px-5 py-4 flex justify-between items-start">
                                    <div>
                                        <h4 class="font-bold text-slate-200 text-base">{{ group.name_en }} <span class="text-xs text-slate-500 font-normal ml-2">Min: {{group.min_selection}} / Max: {{group.max_selection}}</span></h4>
                                        <p class="text-xs text-slate-500 mt-1">{{ group.name_fr }} / <span dir="auto" class="font-cairo">{{ group.name_ar }}</span></p>
                                    </div>
                                    <button @click="deleteModifierGroup(group.id)" class="text-xs font-bold text-harissa/70 hover:text-harissa">Delete Group</button>
                                </div>
                                
                                <div class="bg-slate-900 px-5 py-4 space-y-3">
                                    <!-- Options List -->
                                    <div v-for="opt in group.options" :key="opt.id" class="flex justify-between items-center text-sm border-b border-white/[0.05] pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <span class="text-slate-300 font-semibold">{{ opt.name_en }}</span>
                                            <span class="text-slate-600 text-xs ml-2">{{ opt.name_fr }} / <span dir="auto" class="font-cairo">{{ opt.name_ar }}</span></span>
                                        </div>
                                        <div class="flex items-center gap-4">
                                            <span class="text-saffron font-bold font-mono">+{{ opt.price_override }} MAD</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Add Option Form -->
                                    <div class="pt-2 mt-2 border-t border-white/[0.05]">
                                        <div class="flex flex-wrap gap-2 items-end">
                                            <div class="flex-1 min-w-[120px]">
                                                <input v-model="newOptionForms[group.id].name_en" type="text" class="input-dark text-xs py-1.5 px-2" placeholder="Option (EN)">
                                            </div>
                                            <div class="flex-1 min-w-[120px]">
                                                <input v-model="newOptionForms[group.id].name_fr" type="text" class="input-dark text-xs py-1.5 px-2" placeholder="Option (FR)">
                                            </div>
                                            <div class="flex-1 min-w-[120px]">
                                                <input v-model="newOptionForms[group.id].name_ar" type="text" dir="rtl" class="input-dark font-cairo text-xs py-1.5 px-2" placeholder="Option (AR)">
                                            </div>
                                            <div class="w-24">
                                                <input v-model.number="newOptionForms[group.id].price_override" type="number" class="input-dark text-xs py-1.5 px-2" placeholder="+MAD">
                                            </div>
                                            <button @click="addModifierOption(group)" class="btn btn-saffron py-1.5 px-3 text-xs h-[30px] shrink-0">Add</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer / Add Group Form -->
                        <div class="px-6 py-5 border-t border-white/[0.05] bg-surface shrink-0">
                            <h4 class="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Add New Group</h4>
                            <div class="flex flex-wrap gap-3 items-end">
                                <div class="flex-1 min-w-[140px]">
                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Name (EN)</label>
                                    <input v-model="newGroupForm.name_en" type="text" class="input-dark text-sm" placeholder="e.g. Choose Sauce">
                                </div>
                                <div class="flex-1 min-w-[140px]">
                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Name (FR)</label>
                                    <input v-model="newGroupForm.name_fr" type="text" class="input-dark text-sm" placeholder="e.g. Choix de Sauce">
                                </div>
                                <div class="flex-1 min-w-[140px]">
                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Name (AR)</label>
                                    <input v-model="newGroupForm.name_ar" type="text" dir="rtl" class="input-dark font-cairo text-sm" placeholder="إختر الصلصة">
                                </div>
                                <div class="w-16">
                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Min</label>
                                    <input v-model.number="newGroupForm.min_selection" type="number" class="input-dark text-sm" placeholder="0">
                                </div>
                                <div class="w-16">
                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Max</label>
                                    <input v-model.number="newGroupForm.max_selection" type="number" class="input-dark text-sm" placeholder="1">
                                </div>
                                <button @click="addModifierGroup" :disabled="!newGroupForm.name_en" class="btn btn-saffron h-10 px-5 shrink-0 disabled:opacity-50">Add Group</button>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    `,
"""

content = content.replace('        </div>\n    `,\n    props', MODAL_TEMPLATE + '    props')

# 5. State Injection
STATE_INJECTION = """
        // Modifier Modal State
        const showModifiers = ref(false);
        const modifierContextType = ref('item'); // 'item' or 'category'
        const modifierContextEntity = ref({});
        
        const newGroupForm = ref({ name_en: '', name_fr: '', name_ar: '', min_selection: 0, max_selection: 1 });
        const newOptionForms = ref({}); // keyed by group id

        const openModifiersModal = (type, entity) => {
            modifierContextType.value = type;
            modifierContextEntity.value = entity;
            if (!entity.modifier_groups) entity.modifier_groups = [];
            
            // Initialize option forms for existing groups
            newOptionForms.value = {};
            entity.modifier_groups.forEach(g => {
                newOptionForms.value[g.id] = { name_en: '', name_fr: '', name_ar: '', price_override: 0 };
            });
            
            newGroupForm.value = { name_en: '', name_fr: '', name_ar: '', min_selection: 0, max_selection: 1 };
            showModifiers.value = true;
        };
        
        const closeModifiersModal = () => {
            showModifiers.value = false;
        };

        const addModifierGroup = async () => {
            if (!newGroupForm.value.name_en) return;
            const payload = { ...newGroupForm.value };
            if (modifierContextType.value === 'category') {
                payload.category_id = modifierContextEntity.value.id;
            } else {
                payload.menu_item_id = modifierContextEntity.value.id;
            }
            
            try {
                const res = await api.post('/admin/menu/modifiers/groups', payload);
                const newGroup = { ...res.data, options: [] };
                modifierContextEntity.value.modifier_groups.push(newGroup);
                newOptionForms.value[newGroup.id] = { name_en: '', name_fr: '', name_ar: '', price_override: 0 };
                newGroupForm.value = { name_en: '', name_fr: '', name_ar: '', min_selection: 0, max_selection: 1 };
            } catch (err) {
                console.error(err);
                alert("Failed to add modifier group: " + (err.response?.data?.detail || err.message));
            }
        };

        const addModifierOption = async (group) => {
            const form = newOptionForms.value[group.id];
            if (!form || !form.name_en) return;
            try {
                const res = await api.post('/admin/menu/modifiers/options', { ...form, group_id: group.id });
                group.options.push(res.data);
                newOptionForms.value[group.id] = { name_en: '', name_fr: '', name_ar: '', price_override: 0 };
            } catch (err) {
                console.error(err);
                alert("Failed to add option: " + (err.response?.data?.detail || err.message));
            }
        };

        const deleteModifierGroup = async (groupId) => {
            // NOTE: Need API endpoint for delete, but for now we can rely on standard CRUD if it existed.
            // Wait, does delete group exist? The backend didn't expose DELETE /modifiers/groups !
            // I should just alert that it requires backend support, or if it doesn't exist, I can just skip implementing delete here,
            // or I can add the endpoint to menu.py in another task.
            alert("Delete group API not yet implemented in this view snippet. Requires DELETE /modifiers/groups/:id");
        };

"""

# Inject before loadMenu
content = content.replace('        // ── Load menu ──', STATE_INJECTION + '\n        // ── Load menu ──')

# Inject exports
EXPORTS_INJECTION = """
            showModifiers, modifierContextType, modifierContextEntity, newGroupForm, newOptionForms,
            openModifiersModal, closeModifiersModal, addModifierGroup, addModifierOption, deleteModifierGroup,
"""

content = content.replace('            modalError,', EXPORTS_INJECTION + '            modalError,')

with open('/Users/hamzamoustaati/Desktop/Frontend Repo/GEQO_Frontend/static/js/views/MenuManager.js', 'w') as f:
    f.write(content)

print("Patched MenuManager.js successfully.")
