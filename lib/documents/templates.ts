import { serializeDocumentContent } from './schemas';
import type { DocumentType } from '@/types';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: DocumentType;
  getContent: () => string;
}

function g(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const TEXT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    icon: '📄',
    type: 'text',
    getContent: () =>
      serializeDocumentContent({ blocks: [{ id: g(), type: 'paragraph', text: '' }] }),
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Agenda, attendees & action items',
    icon: '📋',
    type: 'text',
    getContent: () =>
      serializeDocumentContent({
        blocks: [
          { id: g(), type: 'heading1', text: 'Meeting Notes' },
          { id: g(), type: 'heading3', text: '📅 Date & Time' },
          { id: g(), type: 'paragraph', text: '' },
          { id: g(), type: 'heading3', text: '👥 Attendees' },
          { id: g(), type: 'bullet', text: '' },
          { id: g(), type: 'heading3', text: '📋 Agenda' },
          { id: g(), type: 'numbered', text: '' },
          { id: g(), type: 'heading3', text: '🗒️ Notes' },
          { id: g(), type: 'paragraph', text: '' },
          { id: g(), type: 'heading3', text: '✅ Action Items' },
          { id: g(), type: 'list_item', text: '', listType: 'task', checked: false },
        ],
      }),
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Goals, milestones & timeline',
    icon: '🗺️',
    type: 'text',
    getContent: () =>
      serializeDocumentContent({
        blocks: [
          { id: g(), type: 'heading1', text: 'Project Plan' },
          { id: g(), type: 'heading2', text: '🎯 Objective' },
          { id: g(), type: 'paragraph', text: '' },
          { id: g(), type: 'heading2', text: '📦 Deliverables' },
          { id: g(), type: 'bullet', text: '' },
          { id: g(), type: 'heading2', text: '🗺️ Milestones' },
          { id: g(), type: 'numbered', text: 'Phase 1 — Planning' },
          { id: g(), type: 'numbered', text: 'Phase 2 — Execution' },
          { id: g(), type: 'numbered', text: 'Phase 3 — Review' },
          { id: g(), type: 'heading2', text: '⚠️ Risks' },
          { id: g(), type: 'bullet', text: '' },
          { id: g(), type: 'heading2', text: '✅ Open Tasks' },
          { id: g(), type: 'list_item', text: '', listType: 'task', checked: false },
        ],
      }),
  },
  {
    id: 'weekly-report',
    name: 'Weekly Report',
    description: 'Accomplishments, blockers & next steps',
    icon: '📊',
    type: 'text',
    getContent: () =>
      serializeDocumentContent({
        blocks: [
          { id: g(), type: 'heading1', text: 'Weekly Report' },
          { id: g(), type: 'paragraph', text: 'Week of: ' },
          { id: g(), type: 'heading2', text: '✅ Accomplishments' },
          { id: g(), type: 'bullet', text: '' },
          { id: g(), type: 'heading2', text: '🚧 In Progress' },
          { id: g(), type: 'bullet', text: '' },
          { id: g(), type: 'heading2', text: '❌ Blockers' },
          { id: g(), type: 'bullet', text: '' },
          { id: g(), type: 'heading2', text: '📌 Next Week' },
          { id: g(), type: 'list_item', text: '', listType: 'task', checked: false },
        ],
      }),
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Steps to reproduce & expected behavior',
    icon: '🐛',
    type: 'text',
    getContent: () =>
      serializeDocumentContent({
        blocks: [
          { id: g(), type: 'heading1', text: 'Bug Report' },
          { id: g(), type: 'heading3', text: 'Summary' },
          { id: g(), type: 'paragraph', text: '' },
          { id: g(), type: 'heading3', text: '🔁 Steps to Reproduce' },
          { id: g(), type: 'numbered', text: '' },
          { id: g(), type: 'heading3', text: '✅ Expected Behavior' },
          { id: g(), type: 'paragraph', text: '' },
          { id: g(), type: 'heading3', text: '❌ Actual Behavior' },
          { id: g(), type: 'paragraph', text: '' },
          { id: g(), type: 'heading3', text: '🌍 Environment' },
          { id: g(), type: 'bullet', text: 'Platform: ' },
          { id: g(), type: 'bullet', text: 'Version: ' },
        ],
      }),
  },
];

export const SPREADSHEET_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'ss-blank',
    name: 'Blank',
    description: 'Start from scratch',
    icon: '⊞',
    type: 'spreadsheet',
    getContent: () =>
      serializeDocumentContent({
        sheets: [{ name: 'Sheet 1', rows: 20, cols: 10, colWidths: Array(10).fill(80), cells: {} }],
        activeSheet: 0,
      }),
  },
  {
    id: 'ss-budget',
    name: 'Budget Tracker',
    description: 'Monthly income & expense tracker',
    icon: '💰',
    type: 'spreadsheet',
    getContent: () =>
      serializeDocumentContent({
        sheets: [{
          name: 'Budget',
          rows: 20,
          cols: 5,
          colWidths: [150, 90, 90, 90, 90],
          cells: {
            A1: { raw: 'Category', bold: true, bgColor: '#1E293B', color: '#FFFFFF', align: 'center' },
            B1: { raw: 'Planned', bold: true, bgColor: '#1E293B', color: '#FFFFFF', align: 'center' },
            C1: { raw: 'Actual', bold: true, bgColor: '#1E293B', color: '#FFFFFF', align: 'center' },
            D1: { raw: 'Variance', bold: true, bgColor: '#1E293B', color: '#FFFFFF', align: 'center' },
            A2: { raw: 'Income' }, A3: { raw: 'Rent' }, A4: { raw: 'Utilities' },
            A5: { raw: 'Food' }, A6: { raw: 'Transport' }, A7: { raw: 'Other' },
            A9: { raw: 'TOTAL', bold: true },
            D2: { raw: '=B2-C2' }, D3: { raw: '=B3-C3' }, D4: { raw: '=B4-C4' },
            D5: { raw: '=B5-C5' }, D6: { raw: '=B6-C6' }, D7: { raw: '=B7-C7' },
            B9: { raw: '=SUM(B2:B7)', bold: true },
            C9: { raw: '=SUM(C2:C7)', bold: true },
            D9: { raw: '=B9-C9', bold: true },
          },
        }],
        activeSheet: 0,
      }),
  },
  {
    id: 'ss-invoice',
    name: 'Invoice',
    description: 'Client invoice with line items & total',
    icon: '🧾',
    type: 'spreadsheet',
    getContent: () =>
      serializeDocumentContent({
        sheets: [{
          name: 'Invoice',
          rows: 20,
          cols: 5,
          colWidths: [180, 60, 80, 80, 90],
          cells: {
            A1: { raw: 'INVOICE', bold: true, fontSize: 18 },
            A3: { raw: 'Bill To:', bold: true },
            D3: { raw: 'Invoice #:', bold: true }, E3: { raw: '' },
            D4: { raw: 'Date:', bold: true }, E4: { raw: '' },
            D5: { raw: 'Due Date:', bold: true }, E5: { raw: '' },
            A7: { raw: 'Description', bold: true, bgColor: '#1E293B', color: '#FFFFFF' },
            B7: { raw: 'Qty', bold: true, bgColor: '#1E293B', color: '#FFFFFF', align: 'center' },
            C7: { raw: 'Rate', bold: true, bgColor: '#1E293B', color: '#FFFFFF', align: 'center' },
            D7: { raw: 'Amount', bold: true, bgColor: '#1E293B', color: '#FFFFFF', align: 'center' },
            D8: { raw: '=B8*C8' }, D9: { raw: '=B9*C9' }, D10: { raw: '=B10*C10' },
            C12: { raw: 'Subtotal', bold: true }, D12: { raw: '=SUM(D8:D10)' },
            C13: { raw: 'Tax (10%)', bold: true }, D13: { raw: '=D12*0.1' },
            C14: { raw: 'TOTAL', bold: true, fontSize: 14 },
            D14: { raw: '=D12+D13', bold: true, fontSize: 14 },
          },
        }],
        activeSheet: 0,
      }),
  },
  {
    id: 'ss-timeline',
    name: 'Project Timeline',
    description: 'Tasks, owners & status tracking',
    icon: '📅',
    type: 'spreadsheet',
    getContent: () =>
      serializeDocumentContent({
        sheets: [{
          name: 'Timeline',
          rows: 20,
          cols: 6,
          colWidths: [180, 100, 90, 90, 100, 120],
          cells: {
            A1: { raw: 'Task', bold: true, bgColor: '#1E293B', color: '#FFFFFF' },
            B1: { raw: 'Owner', bold: true, bgColor: '#1E293B', color: '#FFFFFF' },
            C1: { raw: 'Start', bold: true, bgColor: '#1E293B', color: '#FFFFFF' },
            D1: { raw: 'End', bold: true, bgColor: '#1E293B', color: '#FFFFFF' },
            E1: { raw: 'Status', bold: true, bgColor: '#1E293B', color: '#FFFFFF' },
            F1: { raw: 'Notes', bold: true, bgColor: '#1E293B', color: '#FFFFFF' },
            E2: { raw: 'Not Started' },
            E3: { raw: 'In Progress' },
            E4: { raw: 'Done' },
          },
        }],
        activeSheet: 0,
      }),
  },
];

export const PRESENTATION_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'pres-blank',
    name: 'Blank',
    description: 'Start from scratch',
    icon: '▷',
    type: 'presentation',
    getContent: () =>
      serializeDocumentContent({
        slides: [{
          id: g(),
          background: '#1E293B',
          elements: [
            {
              id: g(),
              type: 'text',
              x: 10, y: 10, width: 80, height: 25,
              content: 'Click to add title',
              style: { fontSize: 32, bold: true, color: '#FFFFFF', align: 'center' },
            },
            {
              id: g(),
              type: 'text',
              x: 10, y: 42, width: 80, height: 48,
              content: 'Click to add body text',
              style: { fontSize: 18, color: '#CBD5E1', align: 'left' },
            },
          ],
        }],
        theme: { primaryColor: '#2563EB', fontFamily: 'System' },
        slideWidth: 1280,
        slideHeight: 720,
      }),
  },
  {
    id: 'pres-pitch',
    name: 'Business Pitch',
    description: '5-slide investor pitch deck',
    icon: '💼',
    type: 'presentation',
    getContent: () => {
      const mk = (bg: string, title: string, body: string) => ({
        id: g(),
        background: bg,
        elements: [
          {
            id: g(), type: 'text' as const,
            x: 10, y: 10, width: 80, height: 30,
            content: title,
            style: { fontSize: 28, bold: true, color: '#FFFFFF', align: 'center' as const },
          },
          {
            id: g(), type: 'text' as const,
            x: 10, y: 45, width: 80, height: 45,
            content: body,
            style: { fontSize: 16, color: '#CBD5E1', align: 'center' as const },
          },
        ],
      });
      return serializeDocumentContent({
        slides: [
          mk('#0F172A', 'Company Name', 'Your one-line pitch'),
          mk('#1E293B', '🔍 The Problem', 'Describe the pain point your customers face'),
          mk('#1E3A5F', '💡 Our Solution', 'How your product solves the problem'),
          mk('#14532D', '📈 Market Opportunity', 'TAM / SAM / SOM — size of the opportunity'),
          mk('#1E1B4B', '🚀 Get Started', 'contact@company.com'),
        ],
        theme: { primaryColor: '#2563EB', fontFamily: 'System' },
        slideWidth: 1280,
        slideHeight: 720,
      });
    },
  },
  {
    id: 'pres-update',
    name: 'Project Update',
    description: 'Progress, blockers & next steps',
    icon: '📊',
    type: 'presentation',
    getContent: () => {
      const mk = (bg: string, title: string, body: string) => ({
        id: g(),
        background: bg,
        elements: [
          {
            id: g(), type: 'text' as const,
            x: 10, y: 10, width: 80, height: 30,
            content: title,
            style: { fontSize: 28, bold: true, color: '#FFFFFF', align: 'center' as const },
          },
          {
            id: g(), type: 'text' as const,
            x: 10, y: 45, width: 80, height: 45,
            content: body,
            style: { fontSize: 16, color: '#CBD5E1', align: 'left' as const },
          },
        ],
      });
      return serializeDocumentContent({
        slides: [
          mk('#0F172A', 'Project Update', 'Project Name  •  Week of ___'),
          mk('#1E293B', '✅ Progress This Week', '• Milestone 1\n• Milestone 2\n• Milestone 3'),
          mk('#1E3A5F', '🚧 Blockers', '• Blocker 1\n• Blocker 2'),
          mk('#14532D', '📌 Next Steps', '• Action 1\n• Action 2\n• Action 3'),
        ],
        theme: { primaryColor: '#7C3AED', fontFamily: 'System' },
        slideWidth: 1280,
        slideHeight: 720,
      });
    },
  },
];

export const TEMPLATES_BY_TYPE: Partial<Record<DocumentType, DocumentTemplate[]>> = {
  text: TEXT_TEMPLATES,
  spreadsheet: SPREADSHEET_TEMPLATES,
  presentation: PRESENTATION_TEMPLATES,
};
