with open('/Users/hamzamoustaati/Desktop/Frontend Repo/GEQO_Frontend/static/js/views/MenuManager.js', 'r') as f:
    content = f.read()

# Add delete option button
content = content.replace('''
                                            <span class="text-saffron font-bold font-mono">+{{ opt.price_override }} MAD</span>
                                        </div>''', '''
                                            <span class="text-saffron font-bold font-mono">+{{ opt.price_override }} MAD</span>
                                            <button @click="deleteModifierOption(group, opt.id)" class="text-[10px] ml-3 text-harissa hover:text-harissa-light">✕</button>
                                        </div>''')

# Update deleteModifierGroup and add deleteModifierOption logic
content = content.replace('''
        const deleteModifierGroup = async (groupId) => {
            // NOTE: Need API endpoint for delete, but for now we can rely on standard CRUD if it existed.
            // Wait, does delete group exist? The backend didn't expose DELETE /modifiers/groups !
            // I should just alert that it requires backend support, or if it doesn't exist, I can just skip implementing delete here,
            // or I can add the endpoint to menu.py in another task.
            alert("Delete group API not yet implemented in this view snippet. Requires DELETE /modifiers/groups/:id");
        };''', '''
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
        };''')

# Export deleteModifierOption
content = content.replace('addModifierOption, deleteModifierGroup,', 'addModifierOption, deleteModifierGroup, deleteModifierOption,')

with open('/Users/hamzamoustaati/Desktop/Frontend Repo/GEQO_Frontend/static/js/views/MenuManager.js', 'w') as f:
    f.write(content)

print("Patched MenuManager delete logic successfully.")
