import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Lock, Zap, Shield } from "lucide-react";

export default function CredentialsApiDocs() {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Code className="h-10 w-10 text-primary" />
            Credentials API Documentation
          </h1>
          <p className="text-muted-foreground">
            Secure API for n8n workflow integration
          </p>
        </div>

        {/* Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Credentials API provides secure, encrypted access to customer credentials for automation workflows.
              All credentials are encrypted at rest using AES-256-GCM encryption.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                AES-256 Encrypted
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                API Key Auth
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                Rate Limited
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>All API requests require authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Include your N8N API key in the request header:</p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`x-api-key: YOUR_N8N_API_KEY`}</code>
            </pre>
            <p className="text-sm text-muted-foreground mt-4">
              The N8N_API_KEY is stored as an environment variable and must match for all requests.
            </p>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="space-y-6">
          {/* GET Credentials */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge>GET</Badge>
                <CardTitle className="text-xl">Get Customer Credentials</CardTitle>
              </div>
              <CardDescription>Retrieve all credentials for a specific customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-2">Endpoint:</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`${baseUrl}/functions/v1/credentials-api/credentials/:customer_id`}</code>
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">Headers:</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`x-api-key: YOUR_N8N_API_KEY`}</code>
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">Response (200 OK):</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`{
  "credentials": [
    {
      "id": "uuid",
      "tool_name": "Google Workspace",
      "credential_type": "google_oauth",
      "username": "user@example.com",
      "password": "decrypted_password",
      "api_key": "decrypted_api_key",
      "extra_fields": { "client_id": "...", "client_secret": "..." },
      "connection_notes": "Notes...",
      "tags": ["oauth", "google"],
      "is_valid": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}</code>
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">cURL Example:</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`curl -X GET \\
  "${baseUrl}/functions/v1/credentials-api/credentials/CUSTOMER_UUID" \\
  -H "x-api-key: YOUR_N8N_API_KEY"`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* POST Credentials */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="default">POST</Badge>
                <CardTitle className="text-xl">Create Credential</CardTitle>
              </div>
              <CardDescription>Add a new encrypted credential</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-2">Endpoint:</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`${baseUrl}/functions/v1/credentials-api/credentials`}</code>
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">Request Body:</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`{
  "customer_id": "user-uuid",
  "tool_name": "WordPress Site",
  "credential_type": "wordpress_admin",
  "username": "admin",
  "password": "secure_password",
  "api_key": "optional_api_key",
  "extra_fields": { "site_url": "https://example.com" },
  "connection_notes": "Production site credentials",
  "tags": ["wordpress", "production"]
}`}</code>
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">Response (201 Created):</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`{
  "success": true,
  "credential_id": "new-uuid"
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* PUT Credentials */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">PUT</Badge>
                <CardTitle className="text-xl">Update Credential</CardTitle>
              </div>
              <CardDescription>Update an existing credential</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-2">Endpoint:</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`${baseUrl}/functions/v1/credentials-api/credentials/:id`}</code>
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">Request Body (all fields optional):</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`{
  "username": "new_username",
  "password": "new_password",
  "api_key": "new_api_key",
  "extra_fields": { "updated": "fields" },
  "connection_notes": "Updated notes",
  "tags": ["new", "tags"],
  "is_valid": false
}`}</code>
                </pre>
              </div>

              <div>
                <p className="font-semibold mb-2">Response (200 OK):</p>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{`{
  "success": true
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security & Rate Limiting */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Security & Rate Limiting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold mb-2">Encryption:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All credentials are encrypted using AES-256-GCM before storage</li>
                <li>Encryption keys are stored securely in environment variables</li>
                <li>Credentials are decrypted only when requested</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-2">Rate Limiting:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>30 requests per minute per API key</li>
                <li>429 status code returned when limit exceeded</li>
                <li>Rate limit resets every 60 seconds</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-2">Audit Logging:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All credential access is logged with timestamp, user, and IP</li>
                <li>Audit logs include: view, decrypt, edit, delete, and API access events</li>
                <li>Admins can review audit trails in the admin dashboard</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Error Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <code>400</code>
                <span>Bad Request - Missing required fields</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <code>401</code>
                <span>Unauthorized - Invalid API key</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <code>404</code>
                <span>Not Found - Credential not found</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <code>429</code>
                <span>Too Many Requests - Rate limit exceeded</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <code>500</code>
                <span>Internal Server Error - Server error</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
