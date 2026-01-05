import { Editor, Extension, Node } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder';
import Image from 'https://esm.sh/@tiptap/extension-image';
import Link from 'https://esm.sh/@tiptap/extension-link';
import { Markdown } from 'https://esm.sh/tiptap-markdown';
import MathExtension from 'https://esm.sh/@aarkue/tiptap-math-extension';
import Suggestion from 'https://esm.sh/@tiptap/suggestion';
import TaskList from 'https://esm.sh/@tiptap/extension-task-list';
import TaskItem from 'https://esm.sh/@tiptap/extension-task-item';

export class TiptapEditor {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            showToolbar: true,
            ...options
        };
        this.editor = null;
        this.fileHandle = null;
        this.isDirty = false;

        this.init();
    }

    async init() {
        this.injectStyles();
        this.createDOM();
        this.initTheme();
        await this.setupEditor();
        this.bindEvents();
    }


    injectStyles() {
        if (document.getElementById('tiptap-editor-styles')) return;
        const style = document.createElement('style');
        style.id = 'tiptap-editor-styles';
        style.innerHTML = `
            .editor-container {
                max-width: 900px;
                margin: 40px auto;
                background: white;
                border-radius: 24px;
                box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                height: calc(100vh - 80px);
                border: 1px solid rgba(0, 0, 0, 0.05);
                font-family: 'Spline Sans', 'Noto Sans SC', sans-serif;
            }
            /* Custom Slim Scrollbar */
            .editor-content::-webkit-scrollbar, 
            #markdown-preview::-webkit-scrollbar {
                width: 8px;
            }
            .editor-content::-webkit-scrollbar-track,
            #markdown-preview::-webkit-scrollbar-track {
                background: transparent;
            }
            .editor-content::-webkit-scrollbar-thumb,
            #markdown-preview::-webkit-scrollbar-thumb {
                background: #e2e8f0;
                border-radius: 10px;
                border: 2px solid transparent;
                background-clip: content-box;
            }
            .editor-container.dark .editor-content::-webkit-scrollbar-thumb,
            .editor-container.dark #markdown-preview::-webkit-scrollbar-thumb {
                background: #334155;
            }
            .editor-content::-webkit-scrollbar-thumb:hover,
            #markdown-preview::-webkit-scrollbar-thumb:hover {
                background: #cbd5e1;
                background-clip: content-box;
            }
            .editor-container.dark .editor-content::-webkit-scrollbar-thumb:hover,
            .editor-container.dark #markdown-preview::-webkit-scrollbar-thumb:hover {
                background: #475569;
            }
            .toolbar {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 12px 20px;
                border-bottom: 1px solid #f1f5f9;
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(12px);
                position: sticky;
                top: 0;
                z-index: 10;
                flex-wrap: wrap;
            }
            .toolbar-group {
                display: flex;
                align-items: center;
                gap: 4px;
                padding-right: 8px;
                margin-right: 8px;
                border-right: 1px solid #f1f5f9;
            }
            .toolbar-group:last-child { border-right: none; margin-right: 0; }
            .toolbar-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                transition: all 0.2s;
                color: #64748b;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }
            .toolbar-btn:hover { background-color: #f1f5f9; color: #0ea5e9; }
            .toolbar-btn.is-active { background-color: #0ea5e91a; color: #0ea5e9; }
            .material-symbols-rounded {
                font-size: 20px;
                font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            }
            .editor-content { flex: 1; padding: 40px 60px; outline: none; overflow-y: auto; }
            :root {
                --heading-size-h1: 2.25rem;
                --heading-size-h2: 1.875rem;
                --line-height: 1.7;
                --paragraph-spacing: 1.5em;
                --body-font-size: 1.125rem;
                --body-font-family: 'Spline Sans', 'Noto Sans SC', sans-serif;
            }
            .ProseMirror {
                outline: none !important;
                min-height: 500px;
                font-size: var(--body-font-size);
                line-height: var(--line-height);
                font-family: var(--body-font-family);
            }
            .ProseMirror h1 { font-size: var(--heading-size-h1); }
            .prose h1 { font-size: var(--heading-size-h1); }
            .prose h2 { font-size: var(--heading-size-h2); }
            .prose p { margin-bottom: var(--paragraph-spacing); }
            .ProseMirror p.is-editor-empty:first-child::before {
                content: attr(data-placeholder);
                float: left;
                color: #94a3b8;
                pointer-events: none;
                height: 0;
            }
            #markdown-preview {
                display: none;
                background: #fafafa;
                border-top: 1px solid #f1f5f9;
                padding: 24px 60px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 14px;
                white-space: pre-wrap;
                color: #475569;
                flex: 1;
                overflow-y: auto;
            }
            #markdown-preview.visible { display: block; }
            .file-status {
                position: fixed;
                bottom: 24px;
                right: 24px;
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(0, 0, 0, 0.05);
                border-radius: 99px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 50;
                font-family: inherit;
            }
            .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
            .status-dot.saved { background: #10b981; }
            .status-dot.unsaved { background: #f59e0b; }
            .Tiptap-mathematics-render { cursor: pointer; padding: 0 4px; border-radius: 4px; transition: background 0.2s; }
            .Tiptap-mathematics-render:hover { background: #f1f5f9; }
            .Tiptap-mathematics-editor { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0 4px; font-family: inherit; outline: none; }
            p:has(.Tiptap-mathematics-render--block) { text-align: center; margin: 1.5em 0; }
            .editor-container.dark { background: #1e293b; border-color: #334155; box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3); }
            .editor-container.dark .toolbar { background: rgba(30, 41, 59, 0.95); border-color: #334155; }
            .editor-container.dark .toolbar-btn { color: #94a3b8; }
            .editor-container.dark .toolbar-btn:hover { background-color: #334155; color: #38bdf8; }
            .editor-container.dark .toolbar-group { border-color: #334155; }
            .editor-container.dark .Tiptap-mathematics-render { color: #f8fafc; }
            .editor-container.dark .Tiptap-mathematics-render:hover { background: #334155; }
            .editor-container.dark .Tiptap-mathematics-editor { background: #0f172a; border-color: #334155; color: #f8fafc; }
            .file-status.dark { background: rgba(30, 41, 59, 0.95); border-color: #475569; color: #f8fafc; }
            .editor-container.dark #markdown-preview { background: #0f172a !important; color: #94a3b8 !important; }
            
            /* Data Table Rendering */
            .data-table-wrapper { margin: 1.5em 0; overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; }
            .dark .data-table-wrapper { border-color: #334155; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
            .data-table caption { padding: 12px; font-weight: 700; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }
            .dark .data-table caption { background: #1e293b; border-color: #334155; color: #f8fafc; }
            .data-table th { background: #f1f5f9; padding: 10px 16px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
            .dark .data-table th { background: #0f172a; color: #94a3b8; border-color: #334155; }
            .data-table td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
            .dark .data-table td { border-color: #334155; color: #cbd5e1; }
            .data-table tr:last-child td { border-bottom: none; }

            /* Task List Styles */
            ul[data-type="taskList"] {
                list-style: none;
                padding: 0;
                margin: 1.5em 0;
            }
            ul[data-type="taskList"] li {
                display: flex;
                align-items: flex-start;
                margin-bottom: 0.5rem;
            }
            ul[data-type="taskList"] li > label {
                flex: 0 0 auto;
                user-select: none;
                margin-right: 0.75rem;
                padding-top: 0.25rem; /* Fine-tune for middle alignment with first line */
                display: flex;
                align-items: center;
            }
            ul[data-type="taskList"] li > div {
                flex: 1 1 auto;
            }
            ul[data-type="taskList"] li > div p {
                margin: 0 !important;
            }
            ul[data-type="taskList"] li[data-checked="true"] > div {
                text-decoration: line-through;
                color: #94a3b8;
                opacity: 0.7;
            }
            .dark ul[data-type="taskList"] li[data-checked="true"] > div {
                color: #64748b;
            }
            ul[data-type="taskList"] input[type="checkbox"] {
                cursor: pointer;
                width: 1.25rem;
                height: 1.25rem;
                border-radius: 6px;
                border: 2px solid #cbd5e1;
                appearance: none;
                transition: all 0.2s;
                position: relative;
                background: white;
            }
            ul[data-type="taskList"] input[type="checkbox"]:checked {
                background: #0ea5e9;
                border-color: #0ea5e9;
            }
            ul[data-type="taskList"] input[type="checkbox"]:checked::after {
                content: 'check';
                font-family: 'Material Symbols Rounded';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 16px;
            }
            .dark ul[data-type="taskList"] input[type="checkbox"] {
                border-color: #475569;
                background: #0f172a;
            }
            .dark ul[data-type="taskList"] input[type="checkbox"]:checked {
                background: #38bdf8;
                border-color: #38bdf8;
            }

            .modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
                display: none; align-items: center; justify-content: center; z-index: 100;
            }
            .modal-overlay.active { display: flex; }
            .modal-content { background: white; padding: 24px; border-radius: 20px; width: 90%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
            .dark .modal-content { background: #1e293b; color: #f8fafc; border: 1px solid #334155; }
            .setting-row { margin-bottom: 16px; }
            .setting-label { display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
            .dark .setting-label { color: #94a3b8; }
            .setting-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: white; color: inherit; }
            .dark .setting-input { background: #0f172a; border-color: #334155; }
            .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
            .btn-primary { background: #0ea5e9; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer; }
            .btn-secondary { background: #f1f5f9; color: #475569; padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer; }
            .dark .btn-secondary { background: #334155; color: #f8fafc; }
            .slash-menu {
                background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 8px; width: 200px;
                z-index: 200; display: flex; flex-direction: column; gap: 2px;
            }
            .dark .slash-menu { background: #1e293b; border-color: #334155; color: #f8fafc; }
            .slash-item {
                display: flex; align-items: center; gap: 12px; padding: 8px 12px;
                border-radius: 8px; cursor: pointer; transition: all 0.2s;
                text-align: left; width: 100%; font-size: 14px; font-weight: 500; color: #475569;
                background: none; border: none;
            }
            .dark .slash-item { color: #94a3b8; }
            .slash-item:hover, .slash-item.is-selected { background: #f1f5f9; color: #0ea5e9; }
            .dark .slash-item:hover, .dark .slash-item.is-selected { background: #334155; color: #38bdf8; }
            .slash-item .material-symbols-rounded { font-size: 18px; }
        `;
        document.head.appendChild(style);
    }

    createDOM() {
        this.container.innerHTML = `
            <div class="editor-container">
                ${this.options.showToolbar ? `
                <div class="toolbar">
                    <div class="toolbar-group">
                        <button class="toolbar-btn" id="btn-open" title="Open File"><span class="material-symbols-rounded">file_open</span></button>
                        <button class="toolbar-btn" id="btn-save" title="Save File"><span class="material-symbols-rounded">save</span></button>
                    </div>
                    <div class="toolbar-group">
                        <button class="toolbar-btn" data-command="toggleHeading" data-args='{"level": 1}' title="H1"><span class="material-symbols-rounded">format_h1</span></button>
                        <button class="toolbar-btn" data-command="toggleHeading" data-args='{"level": 2}' title="H2"><span class="material-symbols-rounded">format_h2</span></button>
                        <button class="toolbar-btn" data-command="toggleBold" title="Bold"><span class="material-symbols-rounded">format_bold</span></button>
                        <button class="toolbar-btn" data-command="toggleItalic" title="Italic"><span class="material-symbols-rounded">format_italic</span></button>
                    </div>
                    <div class="toolbar-group">
                        <button class="toolbar-btn" data-command="toggleBulletList" title="Bullet List"><span class="material-symbols-rounded">format_list_bulleted</span></button>
                        <button class="toolbar-btn" data-command="toggleOrderedList" title="Ordered List"><span class="material-symbols-rounded">format_list_numbered</span></button>
                        <button class="toolbar-btn" data-command="toggleTaskList" title="Task List"><span class="material-symbols-rounded">checklist</span></button>
                        <button class="toolbar-btn" data-command="toggleCodeBlock" title="Code Block"><span class="material-symbols-rounded">code</span></button>
                    </div>
                    <div class="toolbar-group">
                        <button class="toolbar-btn" id="btn-link" title="Link"><span class="material-symbols-rounded">link</span></button>
                        <button class="toolbar-btn" id="btn-image-web" title="Web Image"><span class="material-symbols-rounded">image</span></button>
                        <button class="toolbar-btn" id="btn-image-local" title="Local Image"><span class="material-symbols-rounded">add_photo_alternate</span></button>
                        <button class="toolbar-btn" id="btn-math-inline" title="Math Inline"><span class="material-symbols-rounded">functions</span></button>
                        <button class="toolbar-btn" id="btn-math-block" title="Math Block"><span class="material-symbols-rounded">calculate</span></button>
                        <button class="toolbar-btn" id="btn-data-table" title="Insert Data Table (from JSON URL)"><span class="material-symbols-rounded">table_chart</span></button>
                    </div>
                    <div class="toolbar-group flex-1 justify-end">
                        <button class="toolbar-btn" id="btn-theme" title="Theme"><span class="material-symbols-rounded" id="theme-icon">dark_mode</span></button>
                        <button class="toolbar-btn" id="btn-prefs" title="Settings"><span class="material-symbols-rounded">settings</span></button>
                        <button class="toolbar-btn" id="btn-toggle-preview" title="Preview"><span class="material-symbols-rounded">visibility</span></button>
                    </div>
                </div>` : ''}
                <div id="tiptap-editor" class="editor-content prose prose-slate max-w-none"></div>
                <div id="markdown-preview"></div>
                <input type="file" id="input-image" accept="image/*" style="display: none;">
            </div>
            <div id="modal-prefs" class="modal-overlay">
                <div class="modal-content">
                    <h3 class="text-xl font-bold mb-6">Editor Preferences</h3>
                    <div class="setting-row">
                        <label class="setting-label">Font Family</label>
                        <select id="pref-font-family" class="setting-input">
                            <option value="'Spline Sans', 'Noto Sans SC', sans-serif">Spline Sans (Default)</option>
                            <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
                            <option value="'Inter', sans-serif">Inter</option>
                            <option value="'Roboto', sans-serif">Roboto</option>
                            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 16px;">
                        <div class="setting-row" style="flex: 1;">
                            <label class="setting-label">Body Size</label>
                            <input type="text" id="pref-body-size" class="setting-input" placeholder="1.125rem">
                        </div>
                        <div class="setting-row" style="flex: 1;">
                            <label class="setting-label">Line Height</label>
                            <input type="text" id="pref-line-height" class="setting-input" placeholder="1.7">
                        </div>
                    </div>
                    <div style="display: flex; gap: 16px;">
                        <div class="setting-row" style="flex: 1;">
                            <label class="setting-label">H1 Size</label>
                            <input type="text" id="pref-h1-size" class="setting-input" placeholder="2.25rem">
                        </div>
                        <div class="setting-row" style="flex: 1;">
                            <label class="setting-label">H2 Size</label>
                            <input type="text" id="pref-h2-size" class="setting-input" placeholder="1.875rem">
                        </div>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label">Paragraph Spacing</label>
                        <input type="text" id="pref-para-spacing" class="setting-input" placeholder="1.5em">
                    </div>
                    <div class="modal-footer">
                        <button id="btn-prefs-close" class="btn-secondary">Cancel</button>
                        <button id="btn-prefs-save" class="btn-primary">Save Changes</button>
                    </div>
                </div>
            </div>
            <div class="file-status">
                <div id="status-dot" class="status-dot"></div>
                <span id="file-name">Local Draft</span>
            </div>
        `;

        this.els = {
            editor: this.container.querySelector('#tiptap-editor'),
            preview: this.container.querySelector('#markdown-preview'),
            themeIcon: this.container.querySelector('#theme-icon'),
            fileName: this.container.querySelector('#file-name'),
            statusDot: this.container.querySelector('#status-dot'),
            modalPrefs: this.container.querySelector('#modal-prefs'),
            inputImage: this.container.querySelector('#input-image'),
            container: this.container.querySelector('.editor-container'),
            status: this.container.querySelector('.file-status')
        };
    }

    // --- Extension Logic ---
    getDataTableNode() {
        return Node.create({
            name: 'dataTable',
            group: 'block',
            content: '', // Read-only, no children
            marks: '',
            selectable: true,
            draggable: true,
            atom: true, // Treat as a single unit

            addAttributes() {
                return {
                    data: {
                        default: null,
                        parseHTML: element => JSON.parse(element.getAttribute('data-table-data') || '{}'),
                        renderHTML: attributes => ({ 'data-table-data': JSON.stringify(attributes.data) }),
                    },
                }
            },

            parseHTML() {
                return [{ tag: 'div[data-table-data]' }]
            },

            renderHTML({ node, HTMLAttributes }) {
                const data = node.attrs.data || {};
                const title = data.metadata?.title || 'Data Table';
                const headers = data.headers || [];
                const rows = data.rows || [];

                // Correct Tiptap DOM structure: [tag, attrs, ...children]
                // We merge HTMLAttributes which contains the 'data-table-data' string generated in addAttributes
                return ['div', { ...HTMLAttributes, class: 'data-table-wrapper', contenteditable: 'false' },
                    ['table', { class: 'data-table' },
                        ['caption', {}, title],
                        ['thead', {},
                            ['tr', {}, ...headers.map(h => ['th', {}, h])]
                        ],
                        ['tbody', {},
                            ...rows.map(row => ['tr', {}, ...row.map(cell => ['td', {}, cell])])
                        ]
                    ]
                ]
            },
        });
    }

    getCommandsExtension() {
        return Extension.create({
            name: 'commands',
            addOptions: () => ({
                suggestion: {
                    char: '/',
                    command: ({ editor, range, props }) => {
                        props.command({ editor, range });
                    },
                },
            }),
            addProseMirrorPlugins() {
                return [
                    Suggestion({
                        editor: this.editor,
                        ...this.options.suggestion,
                    }),
                ]
            },
        });
    }

    getSuggestionItems({ query }) {
        const items = [
            { title: 'Data Table', icon: 'table_chart', command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); this.container.querySelector('#btn-data-table').click(); } },
            { title: 'Heading 1', icon: 'format_h1', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
            { title: 'Heading 2', icon: 'format_h2', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
            { title: 'Bullet List', icon: 'format_list_bulleted', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
            { title: 'Ordered List', icon: 'format_list_numbered', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
            { title: 'Task List', icon: 'checklist', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
            { title: 'Blockquote', icon: 'format_quote', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
            { title: 'Code Block', icon: 'code', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
            { title: 'Bold', icon: 'format_bold', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setMark('bold').run() },
            { title: 'Italic', icon: 'format_italic', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setMark('italic').run() },
            { title: 'Image (Web)', icon: 'image', command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); this.container.querySelector('#btn-image-web').click(); } },
            { title: 'Image (Local)', icon: 'add_photo_alternate', command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); this.container.querySelector('#btn-image-local').click(); } },
            { title: 'Math Block', icon: 'calculate', command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); this.container.querySelector('#btn-math-block').click(); } },
        ];
        return items.filter(item => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 15);
    }

    renderSuggestion() {
        let container;
        let selectedIndex = 0;
        return {
            onStart: (props) => {
                container = document.createElement('div');
                container.className = 'slash-menu';
                props.items.forEach((item, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'slash-item' + (index === selectedIndex ? ' is-selected' : '');
                    btn.innerHTML = `<span class="material-symbols-rounded">${item.icon}</span> ${item.title}`;
                    btn.onclick = () => props.command(item);
                    container.appendChild(btn);
                });
                document.body.appendChild(container);
                const { left, top, height } = props.clientRect();
                container.style.position = 'fixed'; container.style.left = `${left}px`; container.style.top = `${top + height}px`;
            },
            onUpdate: (props) => {
                selectedIndex = 0; container.innerHTML = '';
                props.items.forEach((item, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'slash-item' + (index === selectedIndex ? ' is-selected' : '');
                    btn.innerHTML = `<span class="material-symbols-rounded">${item.icon}</span> ${item.title}`;
                    btn.onclick = () => props.command(item);
                    container.appendChild(btn);
                });
                const { left, top, height } = props.clientRect();
                container.style.left = `${left}px`; container.style.top = `${top + height}px`;
            },
            onKeyDown: (props) => {
                if (props.event.key === 'ArrowUp') { selectedIndex = (selectedIndex + props.items.length - 1) % props.items.length; this.updateMenuSelection(container, selectedIndex); return true; }
                if (props.event.key === 'ArrowDown') { selectedIndex = (selectedIndex + 1) % props.items.length; this.updateMenuSelection(container, selectedIndex); return true; }
                if (props.event.key === 'Enter') { props.command(props.items[selectedIndex]); return true; }
                if (props.event.key === 'Escape') { this.onMenuExit(container); return true; }
                return false;
            },
            onExit: () => this.onMenuExit(container)
        }
    }

    updateMenuSelection(container, selectedIndex) {
        const items = container.querySelectorAll('.slash-item');
        items.forEach((item, index) => {
            if (index === selectedIndex) { item.classList.add('is-selected'); item.scrollIntoView({ block: 'nearest' }); }
            else item.classList.remove('is-selected');
        });
    }

    onMenuExit(container) { if (container) { container.remove(); } }

    // --- Persistence ---
    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TiptapDemoDB', 2);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('editor_state')) db.createObjectStore('editor_state');
                if (!db.objectStoreNames.contains('preferences')) db.createObjectStore('preferences');
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async saveToDB(content) {
        const db = await this.openDB();
        const tx = db.transaction('editor_state', 'readwrite');
        tx.objectStore('editor_state').put(content, 'latest_content');
    }

    async loadFromDB() {
        const db = await this.openDB();
        const tx = db.transaction('editor_state', 'readonly');
        return new Promise(resolve => {
            const req = tx.objectStore('editor_state').get('latest_content');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    }

    async savePrefs(prefs) {
        const db = await this.openDB();
        const tx = db.transaction('preferences', 'readwrite');
        tx.objectStore('preferences').put(prefs, 'editor_prefs');
    }

    async loadPrefs() {
        const db = await this.openDB();
        const tx = db.transaction('preferences', 'readonly');
        const defaultPrefs = { fontFamily: "'Spline Sans', 'Noto Sans SC', sans-serif", bodySize: '1.125rem', lineHeight: '1.7', h1Size: '2.25rem', h2Size: '1.875rem', paraSpacing: '1.5em' };
        return new Promise(resolve => {
            const req = tx.objectStore('preferences').get('editor_prefs');
            req.onsuccess = () => resolve(req.result || defaultPrefs);
            req.onerror = () => resolve(defaultPrefs);
        });
    }

    applyPrefs(prefs) {
        const root = document.documentElement;
        root.style.setProperty('--body-font-family', prefs.fontFamily);
        root.style.setProperty('--body-font-size', prefs.bodySize);
        root.style.setProperty('--line-height', prefs.lineHeight);
        root.style.setProperty('--heading-size-h1', prefs.h1Size);
        root.style.setProperty('--heading-size-h2', prefs.h2Size);
        root.style.setProperty('--paragraph-spacing', prefs.paraSpacing);
    }

    // --- Theme ---
    initTheme() {
        const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            this.els.container.classList.add('dark');
            this.els.status.classList.add('dark');
            this.els.themeIcon.textContent = 'light_mode';
        }
    }

    toggleTheme() {
        const isDark = this.els.container.classList.toggle('dark');
        this.els.status.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
        this.els.themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
        if (this.editor) {
            this.editor.setOptions({
                editorProps: {
                    attributes: {
                        class: isDark ? 'prose prose-slate prose-invert max-w-none editor-content' : 'prose prose-slate max-w-none editor-content',
                    },
                },
            });
        }
        this.els.preview.classList.toggle('prose-invert', isDark);
    }

    // --- Editor Setup ---
    async setupEditor() {
        const [savedContent, prefs] = await Promise.all([this.loadFromDB(), this.loadPrefs()]);
        this.applyPrefs(prefs);

        this.editor = new Editor({
            element: this.els.editor,
            extensions: [
                StarterKit,
                Markdown,
                MathExtension.configure({ evaluation: false }),
                Link.configure({ openOnClick: false }),
                Image,
                this.getDataTableNode(),
                TaskList,
                TaskItem.configure({
                    nested: true,
                }),
                Placeholder.configure({ placeholder: 'Start writing markdown... (Type / for commands)' }),
                this.getCommandsExtension().configure({
                    suggestion: { items: (props) => this.getSuggestionItems(props), render: () => this.renderSuggestion() }
                })
            ],
            editorProps: {
                attributes: {
                    class: this.els.container.classList.contains('dark') ? 'prose prose-slate prose-invert max-w-none editor-content' : 'prose prose-slate max-w-none editor-content',
                }
            },
            content: savedContent || this.getDefaultContent(),
            onUpdate: ({ editor }) => {
                this.saveToDB(editor.getJSON());
                this.isDirty = true;
                this.updateStatus();
                if (this.els.preview.classList.contains('visible')) {
                    this.els.preview.textContent = editor.storage.markdown.getMarkdown();
                }
                this.updateToolbar();
            },
            onTransaction: () => this.updateToolbar()
        });
    }

    getDefaultContent() {
        return {
            type: 'doc', content: [
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to Tiptap Markdown' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Edit this content or open a local .md file!' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Try slash commands by typing /' }] }
            ]
        };
    }

    updateStatus() {
        this.els.statusDot.className = 'status-dot ' + (this.fileHandle ? (this.isDirty ? 'unsaved' : 'saved') : 'saved');
    }

    updateToolbar() {
        this.container.querySelectorAll('[data-command]').forEach(btn => {
            const command = btn.getAttribute('data-command');
            const args = JSON.parse(btn.getAttribute('data-args') || '{}');
            const isActive = this.editor.isActive(command.replace('toggle', '').toLowerCase(), args);
            btn.classList.toggle('is-active', isActive);
        });
    }

    // --- Events ---
    bindEvents() {
        this.container.querySelectorAll('[data-command]').forEach(btn => {
            btn.onclick = () => {
                const command = btn.getAttribute('data-command');
                const args = JSON.parse(btn.getAttribute('data-args') || '{}');
                this.editor.chain().focus()[command](args).run();
            };
        });

        const btnTheme = this.container.querySelector('#btn-theme');
        if (btnTheme) btnTheme.onclick = () => this.toggleTheme();

        const btnTogglePreview = this.container.querySelector('#btn-toggle-preview');
        if (btnTogglePreview) btnTogglePreview.onclick = () => {
            const isVisible = this.els.preview.classList.toggle('visible');
            const icon = btnTogglePreview.querySelector('.material-symbols-rounded');
            if (isVisible) {
                this.els.preview.textContent = this.editor.storage.markdown.getMarkdown();
                this.els.editor.style.display = 'none';
                icon.textContent = 'visibility_off';
            } else {
                this.els.editor.style.display = 'flex';
                icon.textContent = 'visibility';
                this.editor.commands.focus();
            }
        };

        const btnPrefs = this.container.querySelector('#btn-prefs');
        if (btnPrefs) btnPrefs.onclick = async () => {
            const prefs = await this.loadPrefs();
            this.container.querySelector('#pref-font-family').value = prefs.fontFamily;
            this.container.querySelector('#pref-body-size').value = prefs.bodySize;
            this.container.querySelector('#pref-line-height').value = prefs.lineHeight;
            this.container.querySelector('#pref-h1-size').value = prefs.h1Size;
            this.container.querySelector('#pref-h2-size').value = prefs.h2Size;
            this.container.querySelector('#pref-para-spacing').value = prefs.paraSpacing;
            this.els.modalPrefs.classList.add('active');
        };

        this.container.querySelector('#btn-prefs-close').onclick = () => this.els.modalPrefs.classList.remove('active');
        this.container.querySelector('#btn-prefs-save').onclick = async () => {
            const newPrefs = {
                fontFamily: this.container.querySelector('#pref-font-family').value,
                bodySize: this.container.querySelector('#pref-body-size').value,
                lineHeight: this.container.querySelector('#pref-line-height').value,
                h1Size: this.container.querySelector('#pref-h1-size').value,
                h2Size: this.container.querySelector('#pref-h2-size').value,
                paraSpacing: this.container.querySelector('#pref-para-spacing').value
            };
            await this.savePrefs(newPrefs);
            this.applyPrefs(newPrefs);
            this.els.modalPrefs.classList.remove('active');
        };

        const btnLink = this.container.querySelector('#btn-link');
        if (btnLink) btnLink.onclick = () => {
            const previousUrl = this.editor.getAttributes('link').href;
            const url = window.prompt('URL', previousUrl);
            if (url === null) return;
            if (url === '') { this.editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
            this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        };

        const btnImageWeb = this.container.querySelector('#btn-image-web');
        if (btnImageWeb) btnImageWeb.onclick = () => {
            const url = prompt('Enter Image URL');
            if (url) this.editor.chain().focus().setImage({ src: url }).run();
        };

        const btnImageLocal = this.container.querySelector('#btn-image-local');
        if (btnImageLocal) btnImageLocal.onclick = () => this.els.inputImage.click();
        this.els.inputImage.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => this.editor.chain().focus().setImage({ src: event.target.result }).run();
                reader.readAsDataURL(file);
                e.target.value = '';
            }
        };

        const btnMathInline = this.container.querySelector('#btn-math-inline');
        if (btnMathInline) btnMathInline.onclick = () => this.editor.chain().focus().insertContent('$x = y^2$').run();
        const btnMathBlock = this.container.querySelector('#btn-math-block');
        if (btnMathBlock) btnMathBlock.onclick = () => this.editor.chain().focus().insertContent('$$\\frac{a}{b}$$').run();

        const btnDataTable = this.container.querySelector('#btn-data-table');
        if (btnDataTable) btnDataTable.onclick = async () => {
            const url = prompt('Enter Data Table JSON URL (use "mock:" for testing)', 'mock:test');
            if (!url) return;

            try {
                let data;
                if (url.startsWith('mock:')) {
                    // Providing rich mock data for verification
                    data = {
                        metadata: { title: "Company Quarterly Performance (Mock Data)" },
                        headers: ["Department", "Revenue (Q3)", "Growth %", "Status"],
                        rows: [
                            ["Engineering", "$1.2M", "12%", "On Track"],
                            ["Marketing", "$450K", "-3%", "Needs Review"],
                            ["Sales", "$2.8M", "24%", "Exceeding"],
                            ["Support", "$120K", "5%", "Stable"]
                        ]
                    };
                    // Simulate network delay
                    await new Promise(r => setTimeout(r, 500));
                } else {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');
                    data = await response.json();
                }

                // Validate schema loosely
                if (!data.headers || !data.rows) {
                    throw new Error('Invalid JSON schema. Headers and Rows are required.');
                }

                this.editor.chain().focus().insertContent({
                    type: 'dataTable',
                    attrs: { data }
                }).run();
            } catch (err) {
                alert('Failed to load data table: ' + err.message);
                console.error(err);
            }
        };

        const btnOpen = this.container.querySelector('#btn-open');
        if (btnOpen) btnOpen.onclick = async () => {
            try {
                [this.fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'Markdown files', accept: { 'text/markdown': ['.md'] } }] });
                const file = await this.fileHandle.getFile();
                const content = await file.text();
                this.editor.commands.setContent(content);
                this.els.fileName.textContent = file.name;
                this.isDirty = false;
                this.updateStatus();
            } catch (err) { }
        };

        const btnSave = this.container.querySelector('#btn-save');
        if (btnSave) btnSave.onclick = async () => {
            if (!this.fileHandle) {
                try {
                    this.fileHandle = await window.showSaveFilePicker({ suggestedName: 'untitled.md', types: [{ description: 'Markdown files', accept: { 'text/markdown': ['.md'] } }] });
                } catch (err) { return; }
            }
            try {
                const writable = await this.fileHandle.createWritable();
                await writable.write(this.editor.storage.markdown.getMarkdown());
                await writable.close();
                this.isDirty = false;
                this.updateStatus();
                this.els.fileName.textContent = this.fileHandle.name;
            } catch (err) { }
        };
    }

    async loadCloudDoc(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load: ${response.statusText}`);
            const content = await response.text();
            this.setContent(content);
            const fileName = url.split('/').pop() || 'Cloud Document';
            this.els.fileName.textContent = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
            return true;
        } catch (err) {
            console.error('loadCloudDoc Error:', err);
            return false;
        }
    }

    /**
     * Set editor content programmatically
     * @param {string|object} content - Markdown/HTML string or Tiptap JSON object
     * @param {string} format - 'markdown' (default), 'json', or 'html'
     */
    setContent(content, format = 'markdown') {
        if (!this.editor) return;
        this.editor.commands.setContent(content);
        this.isDirty = false;
        this.updateStatus();
    }

    /**
     * Get editor content programmatically
     * @param {string} format - 'markdown' (default) or 'json'
     * @returns {string|object}
     */
    getContent(format = 'markdown') {
        if (!this.editor) return '';
        if (format === 'json') return this.editor.getJSON();
        return this.editor.storage.markdown.getMarkdown();
    }

    getHeadings() {
        if (!this.editor) return [];
        const headings = [];
        this.editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'heading') {
                headings.push({
                    level: node.attrs.level,
                    text: node.textContent,
                    pos: pos
                });
            }
        });
        return headings;
    }
}
