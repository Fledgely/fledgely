# Security Guide

This guide documents the security baseline for Fledgely self-hosted deployments.

## Security Overview

Fledgely is designed with security-first defaults. All deployments include:

- **Encryption at rest**: All data encrypted using Google-managed keys
- **Encryption in transit**: TLS 1.3 for all connections
- **Least privilege IAM**: Service accounts with minimal permissions
- **Secure defaults**: No public access to data stores

## Data Encryption

### Encryption at Rest

All GCP services used by Fledgely encrypt data at rest by default:

| Service         | Encryption                   |
| --------------- | ---------------------------- |
| Firestore       | AES-256, Google-managed keys |
| Cloud Storage   | AES-256, Google-managed keys |
| Cloud Run       | Container images encrypted   |
| Cloud Functions | Code and data encrypted      |

**Customer-Managed Keys (Optional)**

For additional control, you can configure customer-managed encryption keys (CMEK):

```hcl
# In terraform.tfvars (not implemented by default)
encryption_key = "projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY"
```

### Encryption in Transit

All traffic is encrypted:

| Connection            | Protocol        |
| --------------------- | --------------- |
| Browser → Cloud Run   | HTTPS (TLS 1.3) |
| Cloud Run → Firestore | gRPC with TLS   |
| Cloud Run → Storage   | HTTPS           |
| Extension → API       | HTTPS (TLS 1.3) |

HTTP connections are automatically redirected to HTTPS.

## IAM Configuration

### Principle of Least Privilege

Fledgely creates dedicated service accounts with minimal permissions:

#### Cloud Functions Service Account

`fledgely-functions-sa@PROJECT.iam.gserviceaccount.com`

| Role                        | Purpose                |
| --------------------------- | ---------------------- |
| `roles/datastore.user`      | Read/write Firestore   |
| `roles/storage.objectAdmin` | Manage screenshots     |
| `roles/run.invoker`         | Internal service calls |

#### Cloud Run Service Account

`fledgely-cloudrun-sa@PROJECT.iam.gserviceaccount.com`

| Role                     | Purpose             |
| ------------------------ | ------------------- |
| `roles/run.invoker`      | Handle web requests |
| `roles/datastore.viewer` | Read Firestore data |

### No Default Compute Service Account

Fledgely does **not** use the default compute service account, which has overly broad permissions.

## Firestore Security

### Security Rules

Firestore security rules are deployed automatically:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all by default
    match /{document=**} {
      allow read, write: if false;
    }

    // Allow authenticated users to access their family data
    match /families/{familyId} {
      allow read: if request.auth != null &&
                     request.auth.uid in resource.data.members;
      allow write: if request.auth != null &&
                      request.auth.uid in resource.data.guardians;
    }
  }
}
```

### No Public Access

- Firestore requires authentication for all operations
- No anonymous access is configured
- All queries must include valid Firebase Auth token

## Cloud Storage Security

### Uniform Bucket-Level Access

Storage buckets use uniform bucket-level access:

```hcl
uniform_bucket_level_access = true
```

This prevents ACL-based access and enforces IAM policies.

### Public Access Prevention

```hcl
public_access_prevention = "enforced"
```

Objects cannot be made public, even accidentally.

### Retention Policies

Screenshots have lifecycle policies:

- Automatic deletion after configured retention period (default: 90 days)
- Version retention for recovery

## Cloud Run Security

### Authentication Required

Web app authentication is handled by Firebase Auth:

- Users must sign in with Google
- Session tokens validated on each request
- No anonymous access to protected routes

### Container Security

- Containers run as non-root user
- No privileged containers
- Read-only file systems where possible

### Network Security

- VPC connector available for private networking
- Ingress restricted to external only
- No direct database access from internet

## Cloud Functions Security

### Authentication

Functions require valid Firebase Auth tokens:

```javascript
// All endpoints validate auth
if (!request.auth) {
  throw new functions.https.HttpsError('unauthenticated')
}
```

### CORS Configuration

CORS restricts API access to known domains:

- Production domain
- Custom domain (if configured)
- localhost (development only)

## Security Checklist

### Pre-Deployment

- [ ] GCP project uses a unique ID
- [ ] Billing alerts configured
- [ ] Only necessary users have project access
- [ ] Organization policies reviewed (if applicable)

### Post-Deployment

- [ ] Run verification script: `./scripts/verify.sh`
- [ ] Verify Firestore security rules applied
- [ ] Verify Storage bucket is not public
- [ ] Test authentication flow works
- [ ] Review IAM service accounts

### Ongoing

- [ ] Keep Terraform up to date
- [ ] Monitor audit logs for suspicious activity
- [ ] Review access patterns periodically
- [ ] Apply security updates promptly

## Audit Logging

### Cloud Audit Logs

GCP automatically logs:

- Admin Activity logs (always on)
- Data Access logs (configurable)

Enable Data Access logs:

```bash
gcloud projects get-iam-policy PROJECT_ID --format=json > policy.json
# Edit to enable DATA_READ and DATA_WRITE
gcloud projects set-iam-policy PROJECT_ID policy.json
```

### Application Logs

Fledgely logs security-relevant events:

- Authentication attempts
- Data access patterns
- Configuration changes

View logs:

```bash
gcloud logging read "resource.type=cloud_run_revision" --project=PROJECT
```

## Security Hardening (Optional)

### VPC Service Controls

For enterprise deployments, configure VPC Service Controls:

1. Create a service perimeter
2. Add Firestore and Storage to perimeter
3. Configure access levels

### Customer-Managed Encryption Keys

Use Cloud KMS for key management:

1. Create a key ring and key
2. Grant service accounts access
3. Configure resources to use CMEK

### Private Google Access

Run Cloud Functions and Cloud Run in a VPC:

```hcl
vpc_connector = "projects/PROJECT/locations/REGION/connectors/CONNECTOR"
```

## Incident Response

### Suspected Breach

1. **Contain**: Disable affected service accounts

   ```bash
   gcloud iam service-accounts disable SA_EMAIL
   ```

2. **Investigate**: Review audit logs

   ```bash
   gcloud logging read "protoPayload.authenticationInfo.principalEmail=SA_EMAIL"
   ```

3. **Remediate**: Rotate credentials

   ```bash
   gcloud iam service-accounts keys create new-key.json --iam-account=SA_EMAIL
   ```

4. **Recover**: Restore from backup if needed

### Security Contact

For security issues with Fledgely itself:

- File a security advisory on GitHub
- Use responsible disclosure practices

## Compliance Considerations

### GDPR

Fledgely supports GDPR compliance:

- Data export functionality
- Data deletion on request
- Consent management

### COPPA

For children's data:

- Parental consent required
- No direct marketing to children
- Data minimization practices

## Related Documentation

- [GCP Security Best Practices](https://cloud.google.com/security/best-practices)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Run Security](https://cloud.google.com/run/docs/securing)
