/**
 * MenuManager.js — Direction B redesign
 *
 * Features:
 *  - Category filter tabs (ALL + dynamic categories)
 *  - Dense scannable table on Tablet/Desktop
 *  - Card list on Mobile
 *  - Inline price editor (numeric input on pencil click)
 *  - Stock toggle bottom-sheet confirmation (Heuristic #5)
 *  - Out-of-stock rows/cards dimmed to 60% opacity
 *  - Add Category & Add Item modals (dark-theme)
 */
import { ref, computed, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    name: 'MenuManager',
    template: `
        <div class="space-y-6 animate-fade-in">

            <!-- ════════ PAGE HEADER ════════ -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <!-- H2 Removed -->
                </div>
                <button @click="openAddCategoryModal" id="menu-add-category-btn"
                        class="btn btn-saffron text-sm px-5 h-10 shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Category
                </button>
            </div>

            <!-- ════════ CATEGORY FILTER TABS ════════ -->
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button @click="activeCategory = null" id="menu-tab-all"
                        class="shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all"
                        :class="activeCategory === null
                            ? 'bg-saffron text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-surface text-slate-400 hover:text-slate-200 border border-white/[0.07]'">
                    ALL
                </button>
                <button v-for="cat in categories" :key="cat.id"
                        @click="activeCategory = cat.id"
                        :id="'menu-tab-cat-' + cat.id"
                        class="shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all"
                        :class="activeCategory === cat.id
                            ? 'bg-saffron text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-surface text-slate-400 hover:text-slate-200 border border-white/[0.07]'">
                    {{ cat.name_en }}
                </button>
            </div>

            <!-- ════════ LOADING ════════ -->
            <div v-if="loading" class="space-y-3">
                <div v-for="i in 3" :key="i" class="skeleton h-14 w-full rounded-xl"></div>
            </div>

            <!-- ════════ EMPTY STATE ════════ -->
            <div v-else-if="categories.length === 0"
                 class="card-dark p-12 text-center">
                <div class="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-4 border border-white/[0.07]">
                    <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                </div>
                <p class="text-slate-500 font-semibold">Your menu is empty — add a category to get started.</p>
            </div>

            <!-- ════════ CATEGORY BLOCKS ════════ -->
            <div v-else class="space-y-6">
                <div v-for="cat in filteredCategories" :key="cat.id" class="card-dark overflow-hidden">

                    <!-- Category header -->
                    <div class="px-5 py-4 border-b border-white/[0.06] flex justify-between items-center bg-surface/40">
                        <div class="flex items-center gap-3">
                            <img v-if="cat.image_url" :src="cat.image_url" class="w-10 h-10 rounded-lg object-cover bg-slate-800" alt="">
                            <div>
                                <h3 class="text-base font-black text-slate-100">{{ cat.name_en }}</h3>
                                <span class="text-xs text-slate-600 font-medium">{{ cat.name_fr }} / <span dir="auto" class="font-cairo">{{ cat.name_ar }}</span></span>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <button @click="openEditCategoryModal(cat)" class="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                ✎ Edit
                            </button>
                            <button @click="openAddItemModal(cat.id)" :id="'menu-add-item-' + cat.id"
                                    class="text-xs font-bold text-saffron hover:text-saffron-light transition-colors">
                                + Add Item
                            </button>
                            <button @click="deleteCategory(cat.id)" :id="'menu-del-cat-' + cat.id"
                                    class="text-xs font-bold text-harissa/70 hover:text-harissa transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>

                    <!-- ── DESKTOP: dense table ── -->
                    <div class="hidden md:block overflow-x-auto">
                        <table class="table-dark">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Price (MAD)</th>
                                    <th>Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="!cat.items || cat.items.length === 0">
                                    <td colspan="4" class="text-center text-slate-700 italic text-xs py-6">No items — click "+ Add Item" to start.</td>
                                </tr>
                                <tr v-for="item in cat.items" :key="item.id"
                                    :class="!item.is_available ? 'opacity-60' : ''"
                                    class="group">
                                    <!-- Name -->
                                    <td class="flex items-center gap-3 py-3">
                                        <img v-if="item.image_url" :src="item.image_url" class="w-8 h-8 rounded-md object-cover bg-slate-800" alt="">
                                        <div>
                                            <div dir="auto" class="font-semibold text-slate-200 font-cairo">{{ item.name_en }}</div>
                                        <div class="text-xs text-slate-600">{{ item.name_fr }}</div>
                                        </div>
                                    </td>
                                    <!-- Price — inline edit -->
                                    <td class="w-32">
                                        <div v-if="editingPriceId === item.id" class="flex items-center gap-1.5">
                                            <input type="number" inputmode="decimal" pattern="[0-9]*"
                                                   v-model.number="editingPriceValue"
                                                   :id="'menu-price-input-' + item.id"
                                                   class="input-dark w-24 py-1.5 px-2 text-sm"
                                                   @keyup.enter="savePrice(item)"
                                                   @keyup.esc="editingPriceId = null">
                                            <button @click="savePrice(item)" class="text-saffron text-xs font-bold">✓</button>
                                        </div>
                                        <div v-else class="flex items-center gap-2">
                                            <span class="text-slate-300 font-semibold text-sm">{{ item.price }}</span>
                                            <button @click="startEditPrice(item)"
                                                    :id="'menu-edit-price-' + item.id"
                                                    class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-saffron transition-all text-xs">
                                                ✎
                                            </button>
                                        </div>
                                    </td>
                                    <!-- Availability toggle -->
                                    <td class="w-28">
                                        <button @click="promptStockToggle(item)"
                                                :id="'menu-stock-toggle-' + item.id"
                                                class="badge transition-all"
                                                :class="item.is_available ? 'badge-emerald' : 'badge-harissa'">
                                            {{ item.is_available ? '● In Stock' : '✕ Sold Out' }}
                                        </button>
                                    </td>
                                    <!-- Delete -->
                                    <td class="text-right whitespace-nowrap">
                                        <button @click="openEditItemModal(item, cat.id)" class="text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold mr-3 opacity-0 group-hover:opacity-100">
                                            ✎ Edit
                                        </button>
                                        <button @click="openModifiersModal(item, cat.id)" class="text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold mr-3 opacity-0 group-hover:opacity-100">
                                            Mods
                                        </button>
                                        <button @click="deleteItem(item.id)"
                                                :id="'menu-del-item-' + item.id"
                                                class="text-slate-700 hover:text-harissa transition-colors opacity-0 group-hover:opacity-100 align-middle">
                                            <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- ── MOBILE: card list ── -->
                    <div class="md:hidden divide-y divide-white/[0.05]">
                        <div v-if="!cat.items || cat.items.length === 0"
                             class="px-5 py-4 text-sm text-slate-700 italic">No items.</div>
                        <div v-for="item in cat.items" :key="item.id"
                             class="px-5 py-4 flex items-center justify-between gap-3"
                             :class="!item.is_available ? 'opacity-60' : ''">
                            <img v-if="item.image_url" :src="item.image_url" class="w-12 h-12 rounded-md object-cover bg-slate-800 shrink-0" alt="">
                            <div class="flex-1 min-w-0">
                                <div dir="auto" class="font-semibold text-slate-200 text-sm truncate font-cairo">{{ item.name_en }}</div>
                                <div class="text-xs text-slate-500">{{ item.price }} MAD</div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
                                <button @click="promptStockToggle(item)"
                                        class="badge text-xs"
                                        :class="item.is_available ? 'badge-emerald' : 'badge-harissa'">
                                    {{ item.is_available ? 'In Stock' : 'Out' }}
                                </button>
                                <button @click="openEditItemModal(item, cat.id)" class="text-blue-400 text-xs font-bold">✎</button>
                                <button @click="openModifiersModal(item, cat.id)" class="text-blue-400 text-xs font-bold">Mods</button>
                                <button @click="deleteItem(item.id)" class="text-slate-700 hover:text-harissa transition-colors">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ════════ STOCK TOGGLE BOTTOM SHEET ════════ -->
            <template v-if="stockConfirmItem">
                <div class="bottom-sheet-backdrop" @click="stockConfirmItem = null"></div>
                <div class="bottom-sheet">
                    <div class="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5"></div>
                    <h3 class="text-lg font-black text-slate-100 mb-1">
                        {{ stockConfirmItem.is_available ? 'Mark as Sold Out?' : 'Mark as In Stock?' }}
                    </h3>
                    <p class="text-sm text-slate-400 mb-6">
                        <span class="font-bold text-slate-200">{{ stockConfirmItem.name_en }}</span>
                        will be {{ stockConfirmItem.is_available ? 'hidden from the WhatsApp Flow immediately.' : 'visible to customers again.' }}
                    </p>
                    <div class="flex gap-3">
                        <button @click="stockConfirmItem = null" id="stock-cancel-btn" class="btn btn-ghost flex-1">Cancel</button>
                        <button @click="confirmStockToggle" id="stock-confirm-btn"
                                class="btn flex-1 font-bold"
                                :class="stockConfirmItem.is_available ? 'btn-danger' : 'btn-saffron'">
                            {{ stockConfirmItem.is_available ? 'Yes, Sell Out' : 'Yes, Restore' }}
                        </button>
                    </div>
                </div>
            </template>

            <!-- ════════ ADD CATEGORY MODAL ════════ -->
            <template v-if="showAddCategory">
                <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="card-dark w-full max-w-md p-6 shadow-2xl">
                        <h3 class="text-lg font-black text-slate-100 mb-5">{{ catEditingId ? 'Edit Category' : 'New Category' }}</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name (EN)</label>
                                <input v-model="catForm.name_en" id="cat-name-en" type="text" class="input-dark" placeholder="Burgers">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name (FR)</label>
                                <input v-model="catForm.name_fr" id="cat-name-fr" type="text" class="input-dark" placeholder="Burgers">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name (AR)</label>
                                <input v-model="catForm.name_ar" id="cat-name-ar" type="text" dir="rtl" class="input-dark font-cairo" placeholder="برغر">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category Image</label>
                                <input type="file" accept="image/*" @change="e => handleImageSelected(e, catForm)" class="input-dark text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-saffron file:text-black hover:file:bg-saffron-light">
                                <div v-if="catForm.image_url" class="mt-3">
                                    <img :src="catForm.image_url" class="w-16 h-16 object-cover rounded-lg border border-white/10" />
                                </div>
                            </div>
                        </div>
                        <div v-if="modalError" class="mt-4 p-3 rounded-lg bg-harissa/10 border border-harissa/30 text-harissa text-sm">{{ modalError }}</div>
                        <div class="flex gap-3 mt-6">
                            <button @click="showAddCategory = false" class="btn btn-ghost flex-1">Cancel</button>
                            <button @click="saveCategory" id="cat-save-btn" class="btn btn-saffron flex-1">{{ catEditingId ? 'Save Changes' : 'Create' }}</button>
                        </div>
                    </div>
                </div>
            </template>

            <!-- ════════ ADD ITEM MODAL ════════ -->
            <template v-if="showAddItem">
                <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="card-dark w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <h3 class="text-lg font-black text-slate-100 mb-5">{{ itemEditingId ? 'Edit Menu Item' : 'New Menu Item' }}</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name (EN)</label>
                                <input v-model="itemForm.name_en" id="item-name-en" type="text" class="input-dark" placeholder="Classic Burger">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name (FR)</label>
                                <input v-model="itemForm.name_fr" id="item-name-fr" type="text" class="input-dark" placeholder="Burger Classique">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name (AR)</label>
                                <input v-model="itemForm.name_ar" id="item-name-ar" type="text" dir="rtl" class="input-dark font-cairo" placeholder="برغر كلاسيك">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (MAD)</label>
                                <input v-model.number="itemForm.price" id="item-price" type="number" inputmode="decimal" class="input-dark" placeholder="45">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description (optional)</label>
                                <input v-model="itemForm.item_details" id="item-details" type="text" class="input-dark" placeholder="Served with fries">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Item Image</label>
                                <div class="flex items-center gap-3 mb-3">
                                    <input type="checkbox" v-model="itemForm.inherit_image" id="item-inherit-img" class="accent-saffron w-4 h-4">
                                    <label for="item-inherit-img" class="text-sm font-semibold text-slate-300">Use Category Image</label>
                                </div>
                                <div v-if="!itemForm.inherit_image">
                                    <input type="file" accept="image/*" @change="e => handleImageSelected(e, itemForm)" class="input-dark text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-saffron file:text-black hover:file:bg-saffron-light">
                                    <div v-if="itemForm.image_url" class="mt-3">
                                        <img :src="itemForm.image_url" class="w-16 h-16 object-cover rounded-lg border border-white/10" />
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <input type="checkbox" v-model="itemForm.is_available" id="item-available" class="accent-saffron w-4 h-4">
                                <label for="item-available" class="text-sm font-semibold text-slate-300">Available on launch</label>
                            </div>
                        </div>
                        <div v-if="modalError" class="mt-4 p-3 rounded-lg bg-harissa/10 border border-harissa/30 text-harissa text-sm">{{ modalError }}</div>
                        <div class="flex gap-3 mt-6">
                            <button @click="showAddItem = false" class="btn btn-ghost flex-1">Cancel</button>
                            <button @click="saveItem" id="item-save-btn" class="btn btn-saffron flex-1">{{ itemEditingId ? 'Save Changes' : 'Add Item' }}</button>
                        </div>
                    </div>
                </div>
            </template>

            <!-- ════════ UNIVERSAL MODIFIERS MODAL ════════ -->
            <template v-if="showModifiers">
                <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="card-dark w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        <!-- Header -->
                        <div class="px-6 py-4 border-b border-white/[0.05] flex justify-between items-center bg-surface/50 shrink-0">
                            <div>
                                <h3 class="text-lg font-black text-slate-100">
                                    Item Modifiers
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
                        <div class="flex-1 overflow-y-auto p-0 space-y-0 bg-slate-900/50">
                            
                            <!-- Copy from another item -->
                            <div class="bg-surface/30 p-6 border-b border-white/[0.05] flex gap-3 items-end">
                                <div class="flex-1">
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Copy from existing item</label>
                                    <select v-model="copySourceItemId" class="input-dark w-full text-sm h-10">
                                        <option value="">Select an item in this category...</option>
                                        <option v-for="i in getOtherItemsInCategory()" :key="i.id" :value="i.id">{{ i.name_en }}</option>
                                    </select>
                                </div>
                                <button @click="copyModifiers" :disabled="!copySourceItemId" class="btn btn-saffron h-10 px-6 shrink-0 disabled:opacity-50">
                                    Clone Modifiers
                                </button>
                            </div>
                            
                            <div class="p-6 space-y-8">
                            
                            <div v-if="!modifierContextEntity.modifier_groups || modifierContextEntity.modifier_groups.length === 0" class="text-center py-10">
                                <p class="text-slate-500 italic mb-4">No modifier groups yet.</p>
                            </div>
                            
                            <!-- Groups List -->
                            <div v-for="group in modifierContextEntity.modifier_groups" :key="group.id" class="border border-white/[0.1] rounded-xl overflow-hidden">
                                <div class="bg-surface px-5 py-4 flex justify-between items-start">
                                    <div>
                                        <h4 class="font-bold text-slate-200 text-base">{{ group.name_en }} <span class="text-xs text-slate-500 font-normal ml-2">Type: {{ group.group_type }} (Min: {{group.min_selection}} / Max: {{group.max_selection}})</span></h4>
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
                                            <button @click="toggleModifierOption(group, opt)" class="badge text-[10px] cursor-pointer" :class="opt.is_available ? 'badge-emerald' : 'badge-harissa'">
                                                {{ opt.is_available ? 'In Stock' : 'Out' }}
                                            </button>
                                            <button @click="deleteModifierOption(group, opt.id)" class="text-[10px] ml-1 text-harissa hover:text-harissa-light">✕</button>
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
                                <div class="flex-1 min-w-[120px]">
                                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Type</label>
                                    <select v-model="newGroupForm.group_type" class="input-dark text-sm w-full h-10">
                                        <option value="optional">Optional Extras</option>
                                        <option value="mandatory">Mandatory</option>
                                        <option value="exclusion">Exclusion</option>
                                    </select>
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
    props: ['user'],
    setup(props) {
        const categories    = ref([]);
        const loading       = ref(true);
        const activeCategory = ref(null);

        // Inline price editor state
        const editingPriceId    = ref(null);
        const editingPriceValue = ref(0);

        // Stock toggle confirmation
        const stockConfirmItem = ref(null);

        // Modal state
        const showAddCategory = ref(false);
        const showAddItem     = ref(false);
        const addItemCatId    = ref(null);
        const catEditingId    = ref(null);
        const itemEditingId   = ref(null);
        const modalError      = ref('');

        const catForm  = ref({ name_en: '', name_fr: '', name_ar: '', image_url: '' });
        const itemForm = ref({
            name_en: '', name_fr: '', name_ar: '',
            price: 0, item_details: '', image_url: '', inherit_image: false, is_available: true
        });

        const handleImageSelected = (e, formRef) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                formRef.image_url = evt.target.result;
            };
            reader.readAsDataURL(file);
        };

        // ── Filtered categories based on tab ───────────────────────────────
        const filteredCategories = computed(() => {
            if (activeCategory.value === null) return categories.value;
            return categories.value.filter(c => c.id === activeCategory.value);
        });


        // Modifier Modal State
        const showModifiers = ref(false);
        const modifierContextEntity = ref({});
        const copySourceItemId = ref('');
        
        const newGroupForm = ref({ name_en: '', name_fr: '', name_ar: '', min_selection: 0, max_selection: 1, group_type: 'optional' });
        const newOptionForms = ref({}); // keyed by group id

        const openModifiersModal = (item, catId) => {
            modifierContextEntity.value = item;
            copySourceItemId.value = '';
            if (!item.modifier_groups) item.modifier_groups = [];
            
            // Initialize option forms for existing groups
            newOptionForms.value = {};
            item.modifier_groups.forEach(g => {
                newOptionForms.value[g.id] = { name_en: '', name_fr: '', name_ar: '', price_override: 0 };
            });
            
            newGroupForm.value = { name_en: '', name_fr: '', name_ar: '', min_selection: 0, max_selection: 1, group_type: 'optional' };
            showModifiers.value = true;
        };
        
        const closeModifiersModal = () => {
            showModifiers.value = false;
        };

        const getOtherItemsInCategory = () => {
            const currentItem = modifierContextEntity.value;
            if (!currentItem || !currentItem.category_id) return [];
            const cat = categories.value.find(c => c.id === currentItem.category_id);
            if (!cat) return [];
            return cat.items.filter(i => i.id !== currentItem.id);
        };

        const copyModifiers = async () => {
            if (!copySourceItemId.value) return;
            try {
                await api.post(`/admin/menu/items/${modifierContextEntity.value.id}/copy-modifiers/${copySourceItemId.value}`);
                await loadMenu();
                showModifiers.value = false;
            } catch (err) {
                console.error(err);
                alert("Failed to copy modifiers: " + (err.response?.data?.detail || err.message));
            }
        };

        const addModifierGroup = async () => {
            if (!newGroupForm.value.name_en) return;
            const payload = { ...newGroupForm.value, menu_item_id: modifierContextEntity.value.id };
            
            if (payload.group_type === 'mandatory' && payload.min_selection < 1) {
                payload.min_selection = 1;
            }
            
            try {
                const res = await api.post('/admin/menu/modifiers/groups', payload);
                const newGroup = { ...res.data, options: [] };
                modifierContextEntity.value.modifier_groups.push(newGroup);
                newOptionForms.value[newGroup.id] = { name_en: '', name_fr: '', name_ar: '', price_override: 0 };
                newGroupForm.value = { name_en: '', name_fr: '', name_ar: '', min_selection: 0, max_selection: 1, group_type: 'optional' };
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
            if (!confirm('Delete this modifier group? This cannot be undone.')) return;
            try {
                await api.delete('/admin/menu/modifiers/groups/' + groupId);
                modifierContextEntity.value.modifier_groups = modifierContextEntity.value.modifier_groups.filter(g => g.id !== groupId);
            } catch (err) {
                console.error(err);
                alert("Failed to delete group: " + (err.response?.data?.detail || err.message));
            }
        };

        const deleteModifierOption = async (group, optionId) => {
            if (!confirm('Delete this option?')) return;
            try {
                await api.delete('/admin/menu/modifiers/options/' + optionId);
                group.options = group.options.filter(o => o.id !== optionId);
            } catch (err) {
                console.error(err);
                alert("Failed to delete option: " + (err.response?.data?.detail || err.message));
            }
        };

        const toggleModifierOption = async (group, option) => {
            const newAvail = !option.is_available;
            try {
                await api.put(`/admin/menu/modifiers/options/${option.id}`, { is_available: newAvail });
                option.is_available = newAvail;
            } catch (err) {
                console.error(err);
                alert("Failed to toggle option: " + (err.response?.data?.detail || err.message));
            }
        };


        // ── Load menu ───────────────────────────────────────────────────────
        const loadMenu = async () => {
            if (!props.user?.restaurant_id) { loading.value = false; return; }
            loading.value = true;
            try {
                const res = await api.get('/admin/menu/' + props.user.restaurant_id);
                categories.value = res.data;
            } catch (err) {
                console.error('[MenuManager] loadMenu error', err);
            } finally {
                loading.value = false;
            }
        };

        // ── Inline price edit ───────────────────────────────────────────────
        const startEditPrice = (item) => {
            editingPriceId.value    = item.id;
            editingPriceValue.value = item.price;
        };
        const savePrice = async (item) => {
            if (editingPriceValue.value <= 0) return;
            try {
                await api.patch(`/admin/menu/items/${item.id}`, { price: editingPriceValue.value });
                item.price = editingPriceValue.value;
            } catch (err) {
                console.error('[MenuManager] savePrice error', err);
            } finally {
                editingPriceId.value = null;
            }
        };

        // ── Stock toggle ────────────────────────────────────────────────────
        const promptStockToggle = (item) => { stockConfirmItem.value = item; };
        const confirmStockToggle = async () => {
            const item = stockConfirmItem.value;
            if (!item) return;
            stockConfirmItem.value = null;
            const newAvail = !item.is_available;
            try {
                await api.post(`/dashboard/items/${item.id}/toggle-availability`);
                item.is_available = newAvail;
            } catch (err) {
                console.error('[MenuManager] stock toggle error', err);
            }
        };

        // ── Category CRUD ───────────────────────────────────────────────────
        const openAddCategoryModal = () => {
            catEditingId.value = null;
            catForm.value = { name_en: '', name_fr: '', name_ar: '', image_url: '' };
            modalError.value = '';
            showAddCategory.value = true;
        };
        const openEditCategoryModal = (cat) => {
            catEditingId.value = cat.id;
            catForm.value = { ...cat };
            modalError.value = '';
            showAddCategory.value = true;
        };
        const saveCategory = async () => {
            modalError.value = '';
            if (!catForm.value.name_en.trim()) { modalError.value = 'English name is required.'; return; }
            try {
                if (catEditingId.value) {
                    await api.put('/admin/menu/categories/' + catEditingId.value, catForm.value);
                } else {
                    await api.post('/admin/menu/categories', {
                        ...catForm.value,
                        restaurant_id: props.user.restaurant_id
                    });
                }
                showAddCategory.value = false;
                await loadMenu();
            } catch (err) {
                modalError.value = err.response?.data?.detail || 'Failed to save category.';
            }
        };
        const deleteCategory = async (id) => {
            if (!confirm('Delete this category and all its items? This cannot be undone.')) return;
            try {
                await api.delete('/admin/menu/categories/' + id);
                await loadMenu();
            } catch (err) { console.error(err); }
        };

        // ── Item CRUD ────────────────────────────────────────────────────────
        const openAddItemModal = (catId) => {
            itemEditingId.value = null;
            addItemCatId.value = catId;
            itemForm.value     = { name_en: '', name_fr: '', name_ar: '', price: 0, item_details: '', image_url: '', inherit_image: false, is_available: true };
            modalError.value   = '';
            showAddItem.value  = true;
        };
        const openEditItemModal = (item, catId) => {
            itemEditingId.value = item.id;
            addItemCatId.value = catId;
            itemForm.value = { ...item, inherit_image: !item.image_url };
            modalError.value = '';
            showAddItem.value = true;
        };
        const saveItem = async () => {
            modalError.value = '';
            if (!itemForm.value.name_en.trim()) { modalError.value = 'English name is required.'; return; }
            if (itemForm.value.price <= 0)       { modalError.value = 'Price must be greater than 0.'; return; }
            const payload = { ...itemForm.value };
            if (payload.inherit_image) {
                payload.image_url = null;
            }
            delete payload.inherit_image;
            
            try {
                if (itemEditingId.value) {
                    await api.put('/admin/menu/items/' + itemEditingId.value, payload);
                } else {
                    await api.post('/admin/menu/items', {
                        ...payload,
                        category_id: addItemCatId.value,
                        restaurant_id: props.user.restaurant_id,
                    });
                }
                showAddItem.value = false;
                await loadMenu();
            } catch (err) {
                modalError.value = err.response?.data?.detail || 'Failed to save item.';
            }
        };
        const deleteItem = async (id) => {
            if (!confirm('Delete this item?')) return;
            try {
                await api.delete('/admin/menu/items/' + id);
                await loadMenu();
            } catch (err) { console.error(err); }
        };

        onMounted(loadMenu);

        return {
            categories, loading, activeCategory, filteredCategories,
            editingPriceId, editingPriceValue, startEditPrice, savePrice,
            stockConfirmItem, promptStockToggle, confirmStockToggle,
            showAddCategory, catForm, openAddCategoryModal, openEditCategoryModal, saveCategory, deleteCategory, catEditingId,
            showAddItem, itemForm, openAddItemModal, openEditItemModal, saveItem, deleteItem, itemEditingId,

            showModifiers, modifierContextEntity, newGroupForm, newOptionForms, copySourceItemId, getOtherItemsInCategory, copyModifiers,
            openModifiersModal, closeModifiersModal, addModifierGroup, addModifierOption, deleteModifierGroup, deleteModifierOption, toggleModifierOption,
            modalError,
            handleImageSelected
        };
    }
};
