-- Insert initial IDE data
INSERT INTO ides (name, docs_url, status, manifest) VALUES
(
    'Cursor',
    'https://docs.cursor.com',
    'active',
    '{
        "description": "AI-powered code editor with advanced autocomplete and refactoring",
        "language": "typescript",
        "category": "editor",
        "features": ["ai-autocomplete", "refactoring", "multi-file-editing"]
    }'::jsonb
),
(
    'Windsurf',
    'https://docs.windsurf.dev',
    'active',
    '{
        "description": "Modern IDE with integrated AI assistance and cloud sync",
        "language": "javascript",
        "category": "ide",
        "features": ["ai-assistant", "cloud-sync", "collaboration"]
    }'::jsonb
),
(
    'Kiro',
    'https://docs.kiro.dev',
    'active',
    '{
        "description": "Lightweight code editor focused on performance",
        "language": "rust",
        "category": "editor",
        "features": ["performance", "minimal-ui", "plugin-system"]
    }'::jsonb
),
(
    'Continue.dev',
    'https://docs.continue.dev',
    'active',
    '{
        "description": "Open-source AI code assistant that works with any editor",
        "language": "python",
        "category": "assistant",
        "features": ["open-source", "editor-agnostic", "custom-models"]
    }'::jsonb
),
(
    'GitHub Copilot',
    'https://docs.github.com/en/copilot',
    'active',
    '{
        "description": "AI pair programmer that helps write code faster",
        "language": "multiple",
        "category": "assistant",
        "features": ["ai-suggestions", "multi-language", "ide-integration"]
    }'::jsonb
),
(
    'Cody',
    'https://docs.sourcegraph.com/cody',
    'active',
    '{
        "description": "Sourcegraph AI coding assistant with code graph context",
        "language": "multiple",
        "category": "assistant",
        "features": ["context-aware", "code-search", "editor-integrations"]
    }'::jsonb
),
(
    'Tabnine',
    'https://docs.tabnine.com',
    'active',
    '{
        "description": "AI code completion tool with enterprise features",
        "language": "multiple",
        "category": "assistant",
        "features": ["code-completion", "enterprise", "privacy"]
    }'::jsonb
),
(
    'Replit Ghostwriter',
    'https://docs.replit.com/programming-ide/ai/ghostwriter',
    'active',
    '{
        "description": "AI coding assistant integrated into Replit IDE",
        "language": "multiple",
        "category": "assistant",
        "features": ["ai-coding", "replit-integration", "explain-code"]
    }'::jsonb
),
(
    'Amazon CodeWhisperer',
    'https://docs.aws.amazon.com/codewhisperer',
    'active',
    '{
        "description": "AI coding companion from Amazon Web Services",
        "language": "multiple",
        "category": "assistant",
        "features": ["ai-suggestions", "aws-integration", "security-scanning"]
    }'::jsonb
),
(
    'CodeT5',
    'https://huggingface.co/Salesforce/codet5-base',
    'active',
    '{
        "description": "Open-source code generation model",
        "language": "python",
        "category": "model",
        "features": ["open-source", "code-generation", "multi-lingual"]
    }'::jsonb
),
(
    'StarCoder',
    'https://huggingface.co/bigcode/starcoder',
    'active',
    '{
        "description": "Large language model trained on code",
        "language": "python",
        "category": "model",
        "features": ["open-source", "large-model", "code-understanding"]
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;