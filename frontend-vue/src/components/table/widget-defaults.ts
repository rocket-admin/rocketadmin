// The widgets page's per-type constants, from frontend/src/app/components/dashboard/db-table-view/
// db-table-widgets: the JSON5 params a newly picked widget type starts with, and the docs page of
// each type. Types whose default is NO_SETTINGS have read-only params.

export const NO_SETTINGS = '// No settings required';

export const WIDGET_DEFAULT_PARAMS: Record<string, string> = {
	Binary: `// Configure binary display/edit encoding.
// Supported: "hex" (default), "base64", "ascii"
// example:
{
  "encoding": "hex"
}
`,
	Boolean: `// Display "Yes/No" buttons with configurable options:
// - allow_null: Use "false" to require selection, "true" if field can be left unspecified
// - invert_colors: Swap the color scheme (typically green=Yes, red=No becomes red=Yes, green=No)

{
	"allow_null": false,
	"invert_colors": false
}
`,
	Code: `// provide language of code to highlight: 'html', 'css', 'typescript', 'yaml', 'markdown'
// example:
{
  "language": "html"
}
`,
	Color: `// Optional: Specify output format for color values
// Supported formats: "hex", "hex_hash" (default), "rgb", "hsl"
// Example configuration:

{
  "format": "hex_hash"  // Will display colors as "#FF5733"
}

// Format options:
// - "hex": Display as "FF5733" (no hash)
// - "hex_hash": Display as "#FF5733" (default)
// - "rgb": Display as "rgb(255, 87, 51)"
// - "hsl": Display as "hsl(9, 100%, 60%)"`,
	Country: `// Configure country display options
// Example:
{
  "show_flag": true,
  "allow_null": false
}
`,
	Date: `// Configure date display options
// formatDistanceWithinHours: Shows relative time (e.g., "2 hours ago") for dates within the specified hours
// Default: 0 hours. Set to 0 to disable relative time display
{
  "formatDistanceWithinHours": 0
}`,
	DateTime: `// Configure datetime display options
// formatDistanceWithinHours: Shows relative time (e.g., "2 hours ago") for dates within the specified hours
// Default: 0 hours. Set to 0 to disable relative time display
{
  "formatDistanceWithinHours": 0
}`,
	Default: `// No settings required`,
	File: `// provide type of file: 'hex', 'base64' or 'file'
// example:
{
  "type": "hex"
}
`,
	Foreign_key: `// Provide settings for foreign key widget
{
  "column_name": "", // copy the name of the column you selected
  "referenced_column_name": "",
  "referenced_table_name": ""
}
`,
	Image: `// provide image height in px to dispaly in table
// prefix: optional URL prefix to prepend to image source
// example:
{
  "height": 100,
  "prefix": "https://example.com/images/"
}
`,
	JSON: `// No settings required`,
	Language: `// Configure language display options
// show_flag: Display country flag emoji next to language name
// Example:
{
  "show_flag": true
}`,
	Markdown: `// No settings required`,
	Money: `// Configure money widget settings
// cents: when true, stored values are integer minor units (e.g. 1099 = $10.99),
// matching Stripe. For zero-decimal currencies (JPY, KRW, VND, ...) values are
// shown as-is. Do NOT enable on a column that already stores decimal amounts.
// example:
{
  "default_currency": "USD",
  "decimal_places": 2,
  "allow_negative": true,
  "cents": false
}
`,
	Number: `// Configure number display with unit conversion and threshold validation
// Example units: "bytes", "meters", "seconds", "grams"
// threshold_min/threshold_max: Values outside these limits will be highlighted
{
  "unit": null,
  "threshold_min": null,
  "threshold_max": null
}`,
	Password: `// provide algorithm to encrypt your password, one of:
//sha1, sha3, sha224, sha256, sha512, sha384, bcrypt, scrypt, argon2, pbkdf2.
// example:

{
  "encrypt": true,
  "algorithm": "sha256"
}

`,
	Phone: `// Configure international phone number widget
// example:
{
  "preferred_countries": ["US", "GB", "CA"],
  "enable_placeholder": true,
  "phone_validation": true
}
`,
	Range: `// Configure the minimum, maximum and step values for the range
// Default: min = 0, max = 100, step = 1
{
  "min": 0,
  "max": 100,
  "step": 1
}
`,
	Readonly: `// No settings required`,
	Select: `// provide array of options to map database value (key 'value') in human readable value (key 'label');
// for example:
// AK => Alaska,
// CA => California

{
  "allow_null": true,
  "options": [
    {
      "value": "UA",
      "label": "🇺🇦 Ukraine",
      "background_color": "gold"
    },
    {
      "value": "PL",
      "label": "🇵🇱 Poland",
      "background_color": "#FF1212"
    },
    {
      "value": "US",
      "label": "🇺🇸 United States",
      "background_color": "rgba(100, 150, 255, 0.5)"
    }
  ]
}`,
	String: `// Optional validation for string values
// validate: Any validator.js method (e.g., "isEmail", "isURL", "isUUID", "isJSON", "isAlpha", "isNumeric")
// Full list: isEmail, isURL, isMACAddress, isIP, isIPRange, isFQDN, isBoolean, isIBAN, isBIC,
// isAlpha, isAlphanumeric, isNumeric, isPort, isLowercase, isUppercase, isAscii, isBase64,
// isHexadecimal, isHexColor, isRgbColor, isHSL, isMD5, isHash, isJWT, isJSON, isUUID,
// isMongoId, isCreditCard, isISBN, isISSN, isMobilePhone, isPostalCode, isEthereumAddress,
// isCurrency, isBtcAddress, isISO8601, isISO31661Alpha2, isISO31661Alpha3, isISO4217,
// isDataURI, isMagnetURI, isMimeType, isLatLong, isSlug, isStrongPassword, isTaxID, isVAT
// OR use "regex" with a regex parameter for custom pattern matching
// force_send_empty_string: when true, always send "" to the backend on clear,
// even if the column is nullable. Default false (cleared input becomes NULL on nullable columns).
{
  "validate": null,
  "regex": null,
  "force_send_empty_string": false
}`,
	Textarea: `// provide number of strings to show.
{
  "rows": 5
}`,
	Time: `// No settings required`,
	Timezone: `// Configure timezone widget options
// Uses Intl API to populate timezone list automatically
// allow_null: Allow empty/null value selection
{
  "allow_null": false
}
`,
	URL: `// prefix: optional URL prefix to prepend to the href
// example:
{
  "prefix": "https://example.com/"
}
`,
	UUID: `// Configure UUID generation version and parameters
// Available versions: "v1", "v3", "v4" (default), "v5", "v7"
// For v3/v5: provide namespace and optionally name
{
  "version": "v4",
  "namespace": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": ""
}
`,
	Email: `// No settings required`,
	S3: `// Configure S3-compatible bucket widget for file storage
// provider: Cloud provider. Supported values:
//   "aws"           - AWS S3 (default)
//   "digitalocean"  - DigitalOcean Spaces
//   "backblaze"     - Backblaze B2
//   "wasabi"        - Wasabi
//   "cloudflare-r2" - Cloudflare R2 (requires "account_id")
// bucket: bucket name (required)
// prefix: Optional path prefix for uploaded files
// region: Region for the bucket (default: us-east-1; for cloudflare-r2 use "auto")
// account_id: Cloudflare account ID. Required when provider is "cloudflare-r2".
// type: "file" (default) - accepts all file types, "image" - accepts only images
// access_key_id: Unique identifier of the secret containing the Access Key ID
// access_key: Unique identifier of the secret containing the Secret Access Key
//
// ⚠️ IMPORTANT: DO NOT INCLUDE BUCKET SECRETS DIRECTLY IN WIDGET SETTINGS!
// Store your credentials as secrets in Rocketadmin and reference them here by their unique identifiers to ensure security and prevent exposure of sensitive information.

{
  "provider": "aws",
  "bucket": "your-bucket-name",
  "prefix": "uploads/",
  "region": "us-east-1",
  "type": "file",
  "access_key_id": "COMPANY-SECRET/bucket-access-key-id",
  "access_key": "COMPANY-SECRET/bucket-access-key"
}
`,
};

export const WIDGET_DOCS_URLS: Record<string, string> = {
	Binary: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#binary',
	Boolean: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#boolean',
	Code: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#code',
	Color: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#color',
	Country: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#country',
	Foreign_key: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#foreign-key',
	Image: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#image',
	Money: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#money',
	Number: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#number',
	Password: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#password',
	Phone: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#phone',
	Range: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#range',
	Select: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#select',
	String: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#string',
	Textarea: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#textarea',
	URL: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#url',
	UUID: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#uuid',
	Date: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#date-time-and-datetime',
	DateTime: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#date-time-and-datetime',
	Time: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#date-time-and-datetime',
	S3: 'https://docs.rocketadmin.com/Reference/UI%20Widgets/widgets_management#s3',
};

/** The widget types that take params (the editor is read-only for the others). */
export const WIDGETS_WITH_SETTINGS = Object.entries(WIDGET_DEFAULT_PARAMS)
	.filter(([, value]) => value !== NO_SETTINGS)
	.map(([type]) => type);
