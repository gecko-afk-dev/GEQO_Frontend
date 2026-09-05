/**
 * MessageTemplates.js — read-only preview of GEQO's six WhatsApp
 * order-lifecycle message templates.
 *
 * THIS VIEW IS INTENTIONALLY NOT AN EDITOR.
 *
 * WhatsApp classifies a template by its rendered content, not by the category
 * it was registered under. A UTILITY template that picks up promotional copy
 * through an editable field puts the restaurant's WABA at risk of being
 * restricted. The six bodies are therefore platform-owned and frozen server-side
 * in app/services/message_templates.py.
 *
 * Do NOT add a textarea, an input, or a save button for template body text here.
 * If restaurant-level customisation is ever required it must go through
 * GEQO-controlled, pre-vetted variable slots only (a driver name is already a
 * safe variable of that kind) — never free body text.
 */
import {
  ref,
  computed,
  onMounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { api } from "../api.js";

export default {
  name: "MessageTemplates",
  template: `
        <div class="space-y-6 animate-fade-in max-w-4xl">
            <!-- Header -->
            <div>
                <h2 class="text-2xl font-black text-slate-100">WhatsApp Message Templates</h2>
                <p class="text-sm text-slate-500 mt-0.5">
                    The messages your customers receive at each step of their order
                </p>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="space-y-4">
                <div class="skeleton h-12 rounded-xl"></div>
                <div class="skeleton h-56 rounded-2xl"></div>
            </div>

            <!-- Load failure -->
            <div v-else-if="loadError"
                 class="card-dark p-6 flex items-start gap-3 border border-harissa/30">
                <span class="text-xl shrink-0">⚠️</span>
                <div>
                    <p class="text-sm font-bold text-slate-200">Couldn't load message templates</p>
                    <p class="text-xs text-slate-500 mt-1">{{ loadError }}</p>
                    <button @click="load" class="btn btn-ghost text-xs mt-3">Try again</button>
                </div>
            </div>

            <!-- WABA ID missing: the dropdown would be meaningless without it -->
            <div v-else-if="wabaIdMissing"
                 class="card-dark p-6 flex items-start gap-3 border border-saffron/30">
                <span class="text-xl shrink-0">🔑</span>
                <div>
                    <p class="text-sm font-bold text-slate-200">WABA ID required — contact GEQO support</p>
                    <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Your restaurant's Meta WhatsApp Business Account ID hasn't been set up yet.
                        Until it is, GEQO can't publish your order-lifecycle message templates to
                        WhatsApp, so no approval status is available here.
                    </p>
                </div>
            </div>

            <!-- Preview -->
            <template v-else>
                <div>
                    <label for="template-step" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Order step
                    </label>
                    <select id="template-step" v-model="selectedKey" class="input-dark w-full">
                        <option v-for="t in templates" :key="t.key" :value="t.key">{{ t.label }}</option>
                    </select>
                </div>

                <div v-if="selected" class="card-dark p-6 space-y-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h3 class="text-lg font-black text-slate-100">{{ selected.label }}</h3>
                            <p class="text-xs text-slate-500 mt-0.5">{{ selected.description }}</p>
                        </div>
                        <span class="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 border"
                              :class="statusClass(selected.meta_status)">
                            {{ statusLabel(selected.meta_status) }}
                        </span>
                    </div>

                    <!-- Rendered message. Read-only by design: see the file header. -->
                    <div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message</p>
                        <div class="rounded-2xl bg-emerald-900/20 border border-emerald-700/30 px-4 py-3">
                            <p class="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed" dir="auto">{{ selected.body }}</p>
                        </div>
                    </div>

                    <div v-if="selected.variables?.length">
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filled in automatically</p>
                        <div class="flex flex-wrap gap-2">
                            <span v-for="(v, i) in selected.variables" :key="v"
                                  class="text-[11px] font-mono px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400">
                                {{ placeholder(i) }} {{ v }}
                            </span>
                        </div>
                    </div>

                    <p v-if="selected.submitted_at" class="text-[11px] text-slate-600">
                        Submitted to WhatsApp {{ formatDate(selected.submitted_at) }}
                    </p>

                    <p class="text-[11px] text-slate-600 leading-relaxed border-t border-white/[0.06] pt-4">
                        These messages are written and maintained by GEQO and can't be edited.
                        WhatsApp reviews every template, and wording that looks promotional can get a
                        business account restricted — so the copy stays fixed while your order details
                        are filled in automatically.
                    </p>
                </div>
            </template>
        </div>
    `,
  props: ["user"],

  setup() {
    const loading = ref(true);
    const loadError = ref("");
    const templates = ref([]);
    const wabaIdMissing = ref(false);
    const selectedKey = ref("");

    const selected = computed(
      () => templates.value.find((t) => t.key === selectedKey.value) || null,
    );

    // meta_status is null until the template has been submitted to Meta.
    const statusLabel = (status) =>
      ({
        approved: "Approved",
        pending: "Pending review",
        rejected: "Rejected",
      })[status] || "Not submitted";

    const statusClass = (status) =>
      ({
        approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
        pending: "bg-saffron/10 text-saffron border-saffron/25",
        rejected: "bg-harissa/10 text-harissa border-harissa/25",
      })[status] || "bg-white/[0.04] text-slate-500 border-white/[0.08]";

    // Rendered as literal text, e.g. "{{2}}". Built here rather than inline in
    // the template: Vue's parser closes an interpolation at the first "}}", so
    // a nested "{{n}}" inside a mustache does not parse.
    const placeholder = (index) => `{{${index + 1}}}`;

    const formatDate = (iso) => {
      const d = new Date(iso);
      return isNaN(d) ? "" : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    const load = async () => {
      loading.value = true;
      loadError.value = "";
      try {
        const res = await api.get("/admin/restaurant/message-templates");
        templates.value = res.data.templates || [];
        wabaIdMissing.value = !!res.data.waba_id_missing;
        if (!selectedKey.value && templates.value.length) {
          selectedKey.value = templates.value[0].key;
        }
      } catch (err) {
        loadError.value =
          err.response?.data?.detail || "Please try again in a moment.";
      } finally {
        loading.value = false;
      }
    };

    onMounted(load);

    return {
      loading,
      loadError,
      templates,
      wabaIdMissing,
      selectedKey,
      selected,
      statusLabel,
      statusClass,
      placeholder,
      formatDate,
      load,
    };
  },
};
