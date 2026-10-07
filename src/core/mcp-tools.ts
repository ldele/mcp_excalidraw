import type { Tool } from '@modelcontextprotocol/server';
import { EXCALIDRAW_ELEMENT_TYPES } from '../types.js';
import { MAX_WAIT_SECONDS } from './canvas-client.js';

// Shared by export_to_image and get_canvas_screenshot. Rendering happens
// headless inside the canvas server by default; no browser tab is needed.
const IMAGE_RENDER_PROPERTIES = {
  background: {
    type: 'boolean',
    description: 'Include the background (default: true)'
  },
  renderer: {
    type: 'string',
    enum: ['auto', 'node', 'browser'],
    description: '"auto" (default) renders headless in the canvas server, no browser needed. "browser" asks an open canvas tab to render with Excalidraw itself (reference rendering, slower).'
  },
  dark: {
    type: 'boolean',
    description: 'Render in dark mode (default: false)'
  },
  scale: {
    type: 'number',
    description: 'PNG pixel scale from 1 to 4 (default: 1)'
  },
  padding: {
    type: 'number',
    description: 'Padding around the drawing in px (default: 10)'
  },
  elementIds: {
    type: 'array',
    items: { type: 'string' },
    description: 'Render only these elements (their bound labels are included)'
  },
  frameId: {
    type: 'string',
    description: 'Render a single frame, clipped to its bounds'
  }
};

// Tool definitions
export const tools: Tool[] = [
  {
    name: 'create_element',
    description: 'Create a new Excalidraw element. For arrows, use startElementId/endElementId to bind to shapes (auto-routes to edges).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Custom element ID (optional, auto-generated if omitted). Use with startElementId/endElementId in batch_create_elements.' },
        type: {
          type: 'string',
          enum: Object.values(EXCALIDRAW_ELEMENT_TYPES)
        },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        backgroundColor: { type: 'string' },
        strokeColor: { type: 'string' },
        strokeWidth: { type: 'number' },
        strokeStyle: { type: 'string', description: 'Stroke style: solid, dashed, dotted' },
        roughness: { type: 'number' },
        opacity: { type: 'number' },
        text: { type: 'string' },
        fontSize: { type: 'number' },
        fontFamily: { type: ['string', 'number'], description: 'Font family: virgil/hand/handwritten (1), helvetica/sans/sans-serif (2), cascadia/mono/monospace (3), excalifont (5), nunito (6), lilita/lilita one (7), comic shanns/comic (8), or numeric ID' },
        startElementId: { type: 'string', description: 'For arrows: ID of the element to bind the arrow start to. Arrow auto-routes to element edge.' },
        endElementId: { type: 'string', description: 'For arrows: ID of the element to bind the arrow end to. Arrow auto-routes to element edge.' },
        endArrowhead: { type: 'string', description: 'Arrowhead style at end: arrow, bar, dot, triangle, or null' },
        startArrowhead: { type: 'string', description: 'Arrowhead style at start: arrow, bar, dot, triangle, or null' }
      },
      required: ['type', 'x', 'y']
    }
  },
  {
    name: 'update_element',
    description: 'Update an existing Excalidraw element',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: {
          type: 'string',
          enum: Object.values(EXCALIDRAW_ELEMENT_TYPES)
        },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        backgroundColor: { type: 'string' },
        strokeColor: { type: 'string' },
        strokeWidth: { type: 'number' },
        strokeStyle: { type: 'string' },
        roughness: { type: 'number' },
        opacity: { type: 'number' },
        text: { type: 'string' },
        fontSize: { type: 'number' },
        fontFamily: { type: ['string', 'number'], description: 'Font family: virgil/hand/handwritten (1), helvetica/sans/sans-serif (2), cascadia/mono/monospace (3), excalifont (5), nunito (6), lilita/lilita one (7), comic shanns/comic (8), or numeric ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_element',
    description: 'Delete an Excalidraw element',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    }
  },
  {
    name: 'query_elements',
    description: 'Query Excalidraw elements with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: Object.values(EXCALIDRAW_ELEMENT_TYPES)
        },
        filter: {
          type: 'object',
          additionalProperties: true
        },
        bbox: {
          type: 'object',
          description: 'Bounding box filter — only return elements whose origin (x, y) falls within the given coordinate range',
          properties: {
            x_min: { type: 'number' },
            x_max: { type: 'number' },
            y_min: { type: 'number' },
            y_max: { type: 'number' }
          }
        }
      }
    }
  },
  {
    name: 'get_resource',
    description: 'Get an Excalidraw resource',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { 
          type: 'string', 
          enum: ['scene', 'library', 'theme', 'elements'] 
        }
      },
      required: ['resource']
    }
  },
  {
    name: 'group_elements',
    description: 'Group multiple elements together',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['elementIds']
    }
  },
  {
    name: 'ungroup_elements',
    description: 'Ungroup a group of elements',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'string' }
      },
      required: ['groupId']
    }
  },
  {
    name: 'align_elements',
    description: 'Align elements to a specific position',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        },
        alignment: { 
          type: 'string', 
          enum: ['left', 'center', 'right', 'top', 'middle', 'bottom'] 
        }
      },
      required: ['elementIds', 'alignment']
    }
  },
  {
    name: 'distribute_elements',
    description: 'Distribute elements evenly',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        },
        direction: { 
          type: 'string', 
          enum: ['horizontal', 'vertical'] 
        }
      },
      required: ['elementIds', 'direction']
    }
  },
  {
    name: 'lock_elements',
    description: 'Lock elements to prevent modification',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['elementIds']
    }
  },
  {
    name: 'unlock_elements',
    description: 'Unlock elements to allow modification',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['elementIds']
    }
  },
  {
    name: 'create_from_mermaid',
    description: 'Convert a Mermaid diagram to Excalidraw elements and render them on the canvas',
    inputSchema: {
      type: 'object',
      properties: {
        mermaidDiagram: {
          type: 'string',
          description: 'The Mermaid diagram definition (e.g., "graph TD; A-->B; B-->C;")'
        },
        config: {
          type: 'object',
          description: 'Optional Mermaid configuration',
          properties: {
            startOnLoad: { type: 'boolean' },
            flowchart: {
              type: 'object',
              properties: {
                curve: { type: 'string', enum: ['linear', 'basis'] }
              }
            },
            themeVariables: {
              type: 'object',
              properties: {
                fontSize: { type: 'string' }
              }
            },
            maxEdges: { type: 'number' },
            maxTextSize: { type: 'number' }
          }
        }
      },
      required: ['mermaidDiagram']
    }
  },
  {
    name: 'batch_create_elements',
    description: 'Create multiple Excalidraw elements at once. For arrows, use startElementId/endElementId to bind arrows to shapes — Excalidraw auto-routes to element edges. Assign custom id to shapes so arrows can reference them.',
    inputSchema: {
      type: 'object',
      properties: {
        elements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Custom element ID. Arrows can reference this via startElementId/endElementId.' },
              type: {
                type: 'string',
                enum: Object.values(EXCALIDRAW_ELEMENT_TYPES)
              },
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
              backgroundColor: { type: 'string' },
              strokeColor: { type: 'string' },
              strokeWidth: { type: 'number' },
              strokeStyle: { type: 'string', description: 'Stroke style: solid, dashed, dotted' },
              roughness: { type: 'number' },
              opacity: { type: 'number' },
              text: { type: 'string' },
              fontSize: { type: 'number' },
              fontFamily: { type: ['string', 'number'], description: 'Font family: virgil/hand/handwritten (1), helvetica/sans/sans-serif (2), cascadia/mono/monospace (3), excalifont (5), nunito (6), lilita/lilita one (7), comic shanns/comic (8), or numeric ID' },
              startElementId: { type: 'string', description: 'For arrows: ID of element to bind arrow start to' },
              endElementId: { type: 'string', description: 'For arrows: ID of element to bind arrow end to' },
              endArrowhead: { type: 'string', description: 'Arrowhead style at end: arrow, bar, dot, triangle, or null' },
              startArrowhead: { type: 'string', description: 'Arrowhead style at start: arrow, bar, dot, triangle, or null' }
            },
            required: ['type', 'x', 'y']
          }
        }
      },
      required: ['elements']
    }
  },
  {
    name: 'get_element',
    description: 'Get a single Excalidraw element by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The element ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'clear_canvas',
    description: 'Clear all elements from the canvas',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'export_scene',
    description: 'Export the current canvas to .excalidraw JSON format. Optionally write to a file; a path ending in .md is written in the Obsidian Excalidraw plugin format (.excalidraw.md).',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Optional file path to write the scene to (.excalidraw for raw JSON, .excalidraw.md for the Obsidian Excalidraw plugin format)'
        }
      }
    }
  },
  {
    name: 'import_scene',
    description: 'Import elements from a .excalidraw JSON file, an Obsidian .excalidraw.md file, or raw JSON data',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to a .excalidraw JSON or Obsidian .excalidraw.md file'
        },
        data: {
          type: 'string',
          description: 'Raw .excalidraw JSON string (alternative to filePath)'
        },
        mode: {
          type: 'string',
          enum: ['replace', 'merge'],
          description: '"replace" clears canvas first, "merge" appends to existing elements'
        }
      },
      required: ['mode']
    }
  },
  {
    name: 'export_to_image',
    description: 'Export the current canvas to a PNG or SVG image. Renders headless in the canvas server (no browser tab needed); SVGs embed the fonts they use.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['png', 'svg'],
          description: 'Image format'
        },
        filePath: {
          type: 'string',
          description: 'Optional file path to save the image'
        },
        ...IMAGE_RENDER_PROPERTIES
      },
      required: ['format']
    }
  },
  {
    name: 'duplicate_elements',
    description: 'Duplicate elements with a configurable offset',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of elements to duplicate'
        },
        offsetX: { type: 'number', description: 'Horizontal offset (default: 20)' },
        offsetY: { type: 'number', description: 'Vertical offset (default: 20)' }
      },
      required: ['elementIds']
    }
  },
  {
    name: 'snapshot_scene',
    description: 'Save a named snapshot of the current canvas state for later restoration',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for this snapshot'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'restore_snapshot',
    description: 'Restore the canvas from a previously saved named snapshot',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the snapshot to restore'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'describe_scene',
    description: 'Get an AI-readable description of the current canvas: element types, positions, connections, labels, spatial layout, and bounding box. Use this to understand what is on the canvas before making changes, and to find element IDs. For a UI wireframe, prefer describe_wireframe — it reads the same canvas as an interface rather than as a flat list of shapes.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'describe_wireframe',
    description:
      'Read the canvas as a user interface instead of as shapes: which screens exist, ' +
      'what is nested inside what, the reading order of each screen, the likely role of ' +
      'every component (button, input, heading, header, checkbox, divider, ...), which ' +
      'control navigates to which screen, and any human annotations currently on the ' +
      'canvas with the component each one refers to. Use this for UI/UX work — reviewing ' +
      'a wireframe, turning one into code, or understanding a flow a user drew. Roles are ' +
      'inferred and marked with `?` when uncertain; raw type and size are always included. ' +
      'For flowcharts and architecture diagrams use describe_scene instead.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_canvas_changes',
    description:
      'Read what changed on the canvas since you last looked — including edits a person made ' +
      'by hand in the browser. Reports additions, edits and deletions in design terms (moved ' +
      'right 120px, resized, relabelled, restyled) and attributes human markup — sticky notes, ' +
      'circled shapes, arrows — to the element it refers to. This is how you collect design ' +
      'feedback: draw a wireframe, ask the user to mark it up, then call this to read their ' +
      'notes. Call with no arguments to get everything since your previous call.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'number',
          minimum: 0,
          description:
            'Canvas revision to diff from. Omit to continue from your last call (or from the ' +
            'start of the session on the first call).'
        }
      }
    }
  },
  {
    name: 'wait_for_changes',
    description:
      'Hand the pen to the human: block until someone edits the canvas in the browser, then ' +
      'return the same report as get_canvas_changes. Use it right after asking the user to ' +
      'review or mark up a wireframe, instead of polling. Waits for a quiet moment before ' +
      'returning so a burst of edits arrives as one batch. If nobody touches the canvas it ' +
      'returns "no changes" when the timeout expires — call again to keep waiting. Requires ' +
      'the canvas open in a browser tab for human edits to reach the server.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'number',
          minimum: 0,
          description: 'Canvas revision to wait past. Omit to continue from your last call.'
        },
        timeoutSeconds: {
          type: 'number',
          minimum: 1,
          maximum: MAX_WAIT_SECONDS,
          description: `How long to wait before giving up (default 60, max ${MAX_WAIT_SECONDS}).`
        },
        settleSeconds: {
          type: 'number',
          minimum: 0,
          maximum: 30,
          description:
            'Quiet period after the last edit before returning, so one batch covers a whole ' +
            'round of markup (default 1.5).'
        }
      }
    }
  },
  {
    name: 'get_canvas_screenshot',
    description: 'Render the current canvas to a PNG and return it as an image. Renders headless in the canvas server (no browser tab needed). Use this to visually verify what the diagram looks like.',
    inputSchema: {
      type: 'object',
      properties: {
        ...IMAGE_RENDER_PROPERTIES
      }
    }
  },
  {
    name: 'read_diagram_guide',
    description: 'Returns a comprehensive design guide for creating beautiful Excalidraw diagrams: color palette, sizing rules, layout patterns, arrow binding best practices, diagram templates, and anti-patterns. Call this before creating diagrams to produce professional results.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'export_to_excalidraw_url',
    description: 'Export the current canvas to a shareable excalidraw.com URL. The diagram is encrypted and uploaded; anyone with the URL can view it. Returns the shareable link.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'set_viewport',
    description: 'Control the canvas viewport (camera). Auto-fit all elements, zoom-to-fit a subset of elements, center on a specific element, or set zoom/scroll directly. Requires the canvas frontend open in a browser.',
    inputSchema: {
      type: 'object',
      properties: {
        scrollToContent: {
          type: 'boolean',
          description: 'Auto-fit all elements in view (zoom-to-fit)'
        },
        scrollToElementIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Zoom-to-fit the bounding box of one or more elements by ID; every ID must exist'
        },
        viewportZoomFactor: {
          type: 'number',
          exclusiveMinimum: 0,
          maximum: 1,
          description: 'Optional fit-to-viewport zoom factor in the range (0, 1] for scrollToContent or scrollToElementIds; lower values leave more padding'
        },
        scrollToElementId: {
          type: 'string',
          description: 'Center the view on a specific element by ID'
        },
        zoom: {
          type: 'number',
          description: 'Zoom level (0.1–10, where 1 = 100%)'
        },
        offsetX: {
          type: 'number',
          description: 'Horizontal scroll offset'
        },
        offsetY: {
          type: 'number',
          description: 'Vertical scroll offset'
        }
      }
    }
  }
];
