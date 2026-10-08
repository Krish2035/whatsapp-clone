const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WhatsApp Clone REST API',
    version: '1.0.0',
    description: `Comprehensive API Documentation for the WhatsApp Clone backend.
Includes endpoints for Authentication, Users, Conversations, Direct Messaging, Media Uploads, Status/Stories, Audio/Video Calling signaling, AI Assistant integration, and Admin Management.`,
    contact: {
      name: 'WhatsApp Clone Engineering Team',
      url: 'https://github.com/Krish2035/whatsapp-clone'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment'
    },
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT authorization token (e.g., "Bearer eyJhbGciOi...")'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: 'alice' },
          email: { type: 'string', example: 'alice@example.com' },
          avatar_url: { type: 'string', example: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice' },
          status_message: { type: 'string', example: 'Hey there! I am using WhatsApp.' },
          is_online: { type: 'boolean', example: true },
          is_admin: { type: 'boolean', example: false },
          last_seen: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          is_group: { type: 'boolean', example: false },
          group_name: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          participants: {
            type: 'array',
            items: { $ref: '#/components/schemas/User' }
          },
          last_message: { type: 'object' },
          unread_count: { type: 'integer', example: 0 }
        }
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          conversationId: { type: 'integer', example: 10 },
          senderId: { type: 'integer', example: 1 },
          receiverId: { type: 'integer', nullable: true, example: 2 },
          content: { type: 'string', example: 'Hey, how are you doing?' },
          type: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'document'], example: 'text' },
          mediaUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['sent', 'delivered', 'read'], example: 'read' },
          replyToId: { type: 'integer', nullable: true },
          isEdited: { type: 'boolean', example: false },
          isDeleted: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Status: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 5 },
          user_id: { type: 'integer', example: 1 },
          media_url: { type: 'string', nullable: true },
          media_type: { type: 'string', example: 'text' },
          caption: { type: 'string', example: 'Enjoying my day off!' },
          bg_color: { type: 'string', example: '#075e54' },
          duration_ms: { type: 'integer', example: 5000 },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Call: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 22 },
          caller_id: { type: 'integer', example: 1 },
          receiver_id: { type: 'integer', example: 2 },
          call_type: { type: 'string', enum: ['voice', 'video', 'audio'], example: 'video' },
          status: { type: 'string', example: 'connected' },
          started_at: { type: 'string', format: 'date-time' },
          duration_seconds: { type: 'integer', example: 120 }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Resource not found or invalid request' }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'System Health Check',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Server & Database is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'OK' },
                    message: { type: 'string', example: 'WhatsApp Clone Backend Server is running successfully' },
                    dbTime: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', example: 'john_doe' },
                  email: { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'Secr3tP@ssword' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User successfully created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' }
                  }
                }
              }
            }
          },
          '400': { description: 'Bad Request / Username or email taken' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'User Login',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'Secr3tP@ssword' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/users/me': {
      get: {
        summary: 'Get Current Authenticated User Profile',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/users/search': {
      get: {
        summary: 'Search Users by name or email',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search keyword',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Matching users list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/users/profile': {
      put: {
        summary: 'Update Profile status or avatar',
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status_message: { type: 'string' },
                  avatar_url: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Updated user' }
        }
      }
    },
    '/api/conversations': {
      get: {
        summary: 'List user conversations',
        tags: ['Conversations'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Array of conversations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    conversations: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Conversation' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create or find 1-on-1 or group conversation',
        tags: ['Conversations'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  receiverId: { type: 'integer' },
                  participantIds: { type: 'array', items: { type: 'integer' } },
                  groupName: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Conversation ready' }
        }
      }
    },
    '/api/messages/{conversationId}': {
      get: {
        summary: 'Get message history of a conversation',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'conversationId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/messages': {
      post: {
        summary: 'Send a message',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  conversationId: { type: 'integer' },
                  receiverId: { type: 'integer' },
                  content: { type: 'string' },
                  type: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'document'] },
                  mediaUrl: { type: 'string' },
                  replyToId: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Message created' }
        }
      }
    },
    '/api/messages/search': {
      get: {
        summary: 'Full-Text & Index Search across messages',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'conversationId', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Search results' }
        }
      }
    },
    '/api/messages/{messageId}': {
      put: {
        summary: 'Edit an existing message',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string' } }
              }
            }
          }
        },
        responses: { '200': { description: 'Message edited' } }
      },
      delete: {
        summary: 'Delete a message for everyone',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'messageId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Message deleted' } }
      }
    },
    '/api/messages/{conversationId}/read': {
      patch: {
        summary: 'Mark conversation messages as read',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Messages marked read' } }
      }
    },
    '/api/media/upload': {
      post: {
        summary: 'Upload media file (image, audio, video, document)',
        tags: ['Media'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    media_url: { type: 'string' },
                    media_type: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/statuses': {
      get: {
        summary: 'Fetch active status stories',
        tags: ['Statuses'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'List of active statuses' } }
      },
      post: {
        summary: 'Post a new status story',
        tags: ['Statuses'],
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Status created' } }
      }
    },
    '/api/calls/initiate': {
      post: {
        summary: 'Initiate a 1-to-1 Voice or Video Call',
        tags: ['Calls'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['receiverId', 'callType'],
                properties: {
                  receiverId: { type: 'integer' },
                  callType: { type: 'string', enum: ['voice', 'video'] }
                }
              }
            }
          }
        },
        responses: { '201': { description: 'Call initiated' } }
      }
    },
    '/api/calls/history': {
      get: {
        summary: 'Get call log history',
        tags: ['Calls'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Call logs' } }
      }
    },
    '/api/admin/users': {
      get: {
        summary: 'Admin: List all registered users',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'User list for admin' } }
      }
    },
    '/api/admin/stats': {
      get: {
        summary: 'Admin: System analytics & counts',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'System metrics' } }
      }
    }
  }
};

const customCss = `
  .swagger-ui .topbar { background-color: #075e54; border-bottom: 2px solid #128c7e; }
  .swagger-ui .topbar .download-url-wrapper { display: none; }
  .swagger-ui .info h2 { color: #075e54; }
  .swagger-ui .btn.authorize { background-color: #128c7e; color: #fff; border-color: #128c7e; }
  .swagger-ui .btn.authorize svg { fill: #fff; }
`;

module.exports = {
  swaggerUi,
  swaggerDocument,
  customCss
};
