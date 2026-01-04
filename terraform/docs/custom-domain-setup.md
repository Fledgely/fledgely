# Custom Domain Setup

This guide explains how to configure a custom domain for your Fledgely deployment.

## Prerequisites

- Fledgely deployed via Terraform
- A domain you own and can configure DNS for
- Access to your domain registrar's DNS settings

## Step 1: Configure Terraform Variable

Edit your `terraform.tfvars` file to add your custom domain:

```hcl
custom_domain = "fledgely.yourdomain.com"
```

Or for an apex domain:

```hcl
custom_domain = "fledgely.com"
```

## Step 2: Apply Terraform Changes

Run Terraform to create the domain mapping:

```bash
terraform apply
```

This will:

1. Create a Cloud Run domain mapping
2. Begin SSL certificate provisioning
3. Output the required DNS records

## Step 3: Get DNS Records

After apply completes, get the required DNS records:

```bash
terraform output custom_domain_dns_records
```

Example output:

```
[
  {
    "name" = "@"
    "type" = "A"
    "value" = "216.239.32.21"
  },
  {
    "name" = "@"
    "type" = "A"
    "value" = "216.239.34.21"
  },
  {
    "name" = "@"
    "type" = "A"
    "value" = "216.239.36.21"
  },
  {
    "name" = "@"
    "type" = "A"
    "value" = "216.239.38.21"
  },
  {
    "name" = "@"
    "type" = "AAAA"
    "value" = "2001:4860:4802:32::15"
  }
]
```

## Step 4: Add DNS Records

Add the DNS records to your domain registrar:

### For Subdomains (e.g., app.yourdomain.com)

Add a CNAME record:

- **Type**: CNAME
- **Name**: app (or your subdomain)
- **Value**: ghs.googlehosted.com

### For Apex Domains (e.g., yourdomain.com)

Add the A and AAAA records from Terraform output:

- **Type**: A (add all 4 A records)
- **Name**: @ (or leave blank)
- **Value**: (IP addresses from output)

## Step 5: Wait for Verification

DNS propagation can take up to 48 hours, but usually completes within:

- 5-15 minutes for most DNS providers
- Up to 24 hours for some providers

Check the domain status:

```bash
terraform output -json | jq '.custom_domain_status'
```

Or check in GCP Console:

1. Go to [Cloud Run](https://console.cloud.google.com/run)
2. Click on "fledgely-web" service
3. Go to "Domain mappings" tab
4. Check the status

## Step 6: SSL Certificate

Once DNS verification succeeds, Google automatically provisions a managed SSL certificate:

- Certificate provisioning takes 15-30 minutes after DNS verification
- HTTPS is automatically enforced (HTTP redirects to HTTPS)
- Certificate auto-renews before expiration

## Troubleshooting

### Domain mapping stuck in "pending"

1. Verify DNS records are correct
2. Check for DNS propagation: `dig +short your-domain.com`
3. Clear any cached DNS: `sudo dscacheutil -flushcache` (macOS)

### SSL certificate not provisioning

1. Ensure DNS records are correctly set
2. Wait at least 30 minutes after DNS verification
3. Check Cloud Run logs for certificate errors

### "Domain ownership verification failed"

1. Verify you added all required DNS records
2. Check for typos in the DNS record values
3. Some registrars require a trailing dot on CNAME values

### Testing before DNS propagation

Use `/etc/hosts` to test locally:

```bash
# Add to /etc/hosts (temporary)
<Cloud Run IP> your-domain.com
```

## Domain Types Supported

### Subdomains

Recommended for most users:

- `app.yourdomain.com`
- `fledgely.family.org`

Subdomains use a simple CNAME record and are easier to configure.

### Apex Domains

For using the root domain:

- `yourdomain.com`
- `myfamily.org`

Apex domains require multiple A and AAAA records.

### Wildcard Domains

Not supported by Cloud Run domain mapping.

## Removing Custom Domain

To remove the custom domain:

1. Remove `custom_domain` from `terraform.tfvars`
2. Run `terraform apply`
3. Optionally remove DNS records from your registrar

Your Fledgely instance will continue to be accessible at the default Cloud Run URL.

## Security Notes

- All traffic is encrypted with TLS 1.3
- HTTP Strict Transport Security (HSTS) is enabled
- Managed SSL certificates are Google-signed
- Certificates auto-renew 30 days before expiration

## Related Documentation

- [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Managing SSL Certificates](https://cloud.google.com/run/docs/securing/managing-ssl-certificates)
- [DNS Record Types](https://cloud.google.com/dns/docs/records)
