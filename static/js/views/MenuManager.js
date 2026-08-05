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

// CEO: PASTE YOUR IMGBB API KEY HERE
const IMGBB_API_KEY = "c165abbc4884f654c13541e5967d6c3a";


export default {
    name: 'MenuManager',
    template: `
        <div class="flex flex-col font-sans select-none">

            <!-- ════════ LOADING ════════ -->
            <div v-if="loading" class="flex-1 flex items-center justify-center">
                <div class="text-[10px] font-mono tracking-widest text-neutral-500 animate-pulse">SYNCING MENU MATRIX...</div>
            </div>

            <!-- ════════ MAIN SPLIT GRID ════════ -->
            <div v-else class="flex-1 grid grid-cols-1 lg:grid-cols-16 gap-6">
                
                <!-- LEFT PANEL: CATEGORIES (5 cols) -->
                <div class="lg:col-span-5 bg-[#141414] border border-neutral-800 flex flex-col">
                    <div class="p-4 border-b border-neutral-800 bg-[#0A0A0A] flex justify-between items-center shrink-0">
                        <span class="text-xs font-mono font-bold text-neutral-500 tracking-widest uppercase">CATEGORIES</span>
                        <button @click="openAddCategoryModal" id="menu-add-category-btn"
                                class="text-[10px] font-mono font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest transition-colors">
                            [+ NEW CATEGORY]
                        </button>
                    </div>
                    
                    <div v-if="categories.length === 0" class="p-6 text-center text-neutral-600 font-mono text-[10px] tracking-widest">
                        NO CATEGORIES FOUND
                    </div>
                    <div v-else class="flex-1 p-4 space-y-3 scrollbar-hide">
                        <button @click="activeCategory = null"
                                class="w-full text-left p-3 border font-mono text-[11px] font-black tracking-widest uppercase transition-all"
                                :class="activeCategory === null ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-[#1A1A1A] border-neutral-800 text-neutral-400 hover:bg-[#262626]'">
                            [ ALL ]
                        </button>
                        <div v-for="cat in categories" :key="cat.id" class="flex items-stretch gap-2">
                            <button @click="activeCategory = cat.id"
                                    class="flex-1 text-left p-3 border font-mono text-[11px] font-black tracking-widest uppercase transition-all flex justify-between items-center"
                                    :class="activeCategory === cat.id ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-[#1A1A1A] border-neutral-800 text-neutral-400 hover:bg-[#262626]'">
                                <div class="flex items-center gap-2 overflow-hidden">
                                    <div v-if="cat.image_url" class="w-5 h-5 rounded bg-neutral-800 shrink-0 overflow-hidden">
                                        <img :src="cat.image_url" class="w-full h-full object-cover opacity-80" />
                                    </div>
                                    <span dir="auto" class="truncate">{{ cat.name_en }}</span>
                                </div>
                                <span class="bg-[#0A0A0A] text-[9px] px-2 py-0.5 ml-2 border border-neutral-800">{{ cat.items?.length || 0 }}</span>
                            </button>
                            <button @click="openEditCategoryModal(cat)" class="px-3 border font-mono text-[10px] font-black tracking-widest text-blue-400 hover:bg-blue-400/10 transition-colors" :class="activeCategory === cat.id ? 'border-amber-500/50 bg-amber-500/5' : 'border-neutral-800 bg-[#1A1A1A]'">EDIT</button>
                            <button @click="deleteCategory(cat.id)" class="px-3 border font-mono text-[10px] font-black tracking-widest text-red-500 hover:bg-red-500/10 transition-colors" :class="activeCategory === cat.id ? 'border-amber-500/50 bg-amber-500/5' : 'border-neutral-800 bg-[#1A1A1A]'">DEL</button>
                        </div>
                    </div>
                </div>

                <!-- RIGHT PANEL: ITEMS (11 cols) -->
                <div class="lg:col-span-11 bg-[#141414] border border-neutral-800 flex flex-col relative">
                    <div class="flex-1 scrollbar-hide">
                        <div v-if="filteredCategories.length === 0" class="flex-1 flex items-center justify-center p-10 h-full text-center text-[10px] font-mono tracking-widest uppercase text-neutral-600">
                            SELECT OR CREATE A CATEGORY
                        </div>
                        
                        <div v-for="cat in filteredCategories" :key="cat.id" class="mb-8 last:mb-0">
                            <div class="sticky top-0 bg-[#0A0A0A] border-b border-neutral-800 px-6 py-4 flex justify-between items-center z-10">
                                <div>
                                    <h3 class="text-sm font-black font-mono text-neutral-200 tracking-widest uppercase" dir="auto">{{ cat.name_en }}</h3>
                                    <span class="text-[10px] font-mono text-neutral-500 mt-1 block">{{ cat.name_fr }} / <span dir="auto" class="font-sans font-semibold">{{ cat.name_ar }}</span></span>
                                </div>
                                <button @click="openAddItemModal(cat.id)" class="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-black font-mono text-amber-500 tracking-widest uppercase transition-colors">
                                    [+ ADD ITEM]
                                </button>
                            </div>

                            <div class="p-6">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-neutral-800">
                                            <th class="py-3 px-2 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Item Name</th>
                                            <th class="py-3 px-2 text-[10px] font-mono text-neutral-500 uppercase tracking-widest w-32">Price (MAD)</th>
                                            <th class="py-3 px-2 text-[10px] font-mono text-neutral-500 uppercase tracking-widest w-28 text-center">Stock</th>
                                            <th class="py-3 px-2 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-right w-48">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-neutral-800/50">
                                        <tr v-if="!cat.items || cat.items.length === 0">
                                            <td colspan="4" class="py-8 text-center text-[10px] font-mono text-neutral-600 tracking-widest uppercase">Empty Category</td>
                                        </tr>
                                        <tr v-for="item in cat.items" :key="item.id" class="group hover:bg-white/[0.02] transition-colors" :class="!item.is_available ? 'opacity-50' : ''">
                                            <td class="py-4 px-2">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded bg-neutral-800 shrink-0 overflow-hidden border border-neutral-700">
                                                        <img v-if="item.image_url || cat.image_url" :src="item.image_url || cat.image_url" class="w-full h-full object-cover opacity-80" />
                                                        <div v-else class="w-full h-full flex items-center justify-center text-[10px] font-bold text-neutral-600">{{ item.name_en?.charAt(0) || '?' }}</div>
                                                    </div>
                                                    <div>
                                                        <div class="font-bold text-neutral-200 text-sm font-sans" dir="auto">{{ item.name_en }}</div>
                                                        <div class="text-xs text-neutral-500 mt-0.5">{{ item.name_fr }}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-4 px-2">
                                                <div v-if="editingPriceId === item.id" class="flex items-center gap-2">
                                                    <input type="number" inputmode="decimal" v-model.number="editingPriceValue"
                                                           class="bg-[#0A0A0A] border border-neutral-700 text-neutral-200 text-xs px-2 py-1 w-20 font-mono outline-none focus:border-amber-500"
                                                           @keyup.enter="savePrice(item)" @keyup.esc="editingPriceId = null">
                                                    <button @click="savePrice(item)" class="text-amber-500 font-black text-sm">✓</button>
                                                </div>
                                                <div v-else class="flex items-center gap-2 group-hover:text-amber-500 transition-colors">
                                                    <span class="font-mono text-sm font-bold text-neutral-300">{{ item.price }}</span>
                                                    <button @click="startEditPrice(item)" class="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-amber-500 text-xs">✎</button>
                                                </div>
                                            </td>
                                            <td class="py-4 px-2 text-center">
                                                <button @click="promptStockToggle(item)"
                                                        class="px-2 py-1 text-[9px] font-black font-mono tracking-widest uppercase border transition-colors"
                                                        :class="item.is_available ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'">
                                                    {{ item.is_available ? 'IN STOCK' : 'SOLD OUT' }}
                                                </button>
                                            </td>
                                            <td class="py-4 px-2 text-right">
                                                <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button @click="openModifiersModal(item, cat.id)" class="text-[10px] font-mono font-black tracking-widest uppercase text-blue-400 hover:text-blue-300 border-b border-blue-400/30">MODS</button>
                                                    <button @click="openEditItemModal(item, cat.id)" class="text-[10px] font-mono font-black tracking-widest uppercase text-amber-500 hover:text-amber-400 border-b border-amber-500/30">EDIT</button>
                                                    <button @click="deleteItem(item.id)" class="text-[10px] font-mono font-black tracking-widest uppercase text-red-500 hover:text-red-400 border-b border-red-500/30">DEL</button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ════════ STOCK TOGGLE BOTTOM SHEET ════════ -->
            <template v-if="stockConfirmItem">
                <div class="absolute inset-0 bg-black/80 z-40" @click="stockConfirmItem = null"></div>
                <div class="absolute bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-neutral-800 p-6 z-50">
                    <h3 class="text-sm font-black font-mono text-neutral-200 tracking-widest uppercase mb-4">
                        {{ stockConfirmItem.is_available ? 'MARK AS SOLD OUT?' : 'MARK AS IN STOCK?' }}
                    </h3>
                    <p class="text-sm text-neutral-400 mb-6 font-sans">
                        <span class="font-bold text-amber-500" dir="auto">{{ stockConfirmItem.name_en }}</span>
                        will be {{ stockConfirmItem.is_available ? 'hidden from the catalog immediately.' : 'visible to customers again.' }}
                    </p>
                    <div class="flex gap-3">
                        <button @click="stockConfirmItem = null" class="flex-1 py-3 border border-neutral-700 font-mono text-xs font-black tracking-widest uppercase hover:bg-neutral-800">Cancel</button>
                        <button @click="confirmStockToggle"
                                class="flex-1 py-3 border font-mono text-xs font-black tracking-widest uppercase"
                                :class="stockConfirmItem.is_available ? 'border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'">
                            {{ stockConfirmItem.is_available ? 'CONFIRM' : 'CONFIRM' }}
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
        const categories = ref([]);
        const loading = ref(true);
        const activeCategory = ref(null);

        // Inline price editor state
        const editingPriceId = ref(null);
        const editingPriceValue = ref(0);

        // Stock toggle confirmation
        const stockConfirmItem = ref(null);

        // Modal state
        const showAddCategory = ref(false);
        const showAddItem = ref(false);
        const addItemCatId = ref(null);
        const catEditingId = ref(null);
        const itemEditingId = ref(null);
        const modalError = ref('');

        const catForm = ref({ name_en: '', name_fr: '', name_ar: '', image_url: '' });
        const itemForm = ref({
            name_en: '', name_fr: '', name_ar: '',
            price: 0, item_details: '', image_url: '', inherit_image: false, is_available: true
        });

        const handleImageSelected = async (e, formRef) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data && data.success) {
                    formRef.image_url = data.data.url;
                } else {
                    alert('Image upload failed: ' + (data.error?.message || 'Unknown error'));
                }
            } catch (err) {
                console.error(err);
                alert('Image upload failed. Check console for details.');
            }
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
                const cat = categories.value.find(c => c.id === modifierContextEntity.value.category_id);
                if (cat) {
                    const updatedItem = cat.items.find(i => i.id === modifierContextEntity.value.id);
                    if (updatedItem) {
                        openModifiersModal(updatedItem, cat.id);
                    }
                }
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
            editingPriceId.value = item.id;
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
            itemForm.value = { name_en: '', name_fr: '', name_ar: '', price: 0, item_details: '', image_url: '', inherit_image: false, is_available: true };
            modalError.value = '';
            showAddItem.value = true;
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
            if (itemForm.value.price <= 0) { modalError.value = 'Price must be greater than 0.'; return; }
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
