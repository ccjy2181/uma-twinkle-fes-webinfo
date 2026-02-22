# GitHub Pages Deploy Guide

Repository: `ccjy2181/uma-twinkle-fes-webinfo`

## 1) Push source
```bash
cd /home/codex/uma-twinkle-fes-webinfo
git push -u origin main
```

If auth is required:
```bash
gh auth login
```
or set PAT once:
```bash
git remote set-url origin https://<GITHUB_USERNAME>:<PAT>@github.com/ccjy2181/uma-twinkle-fes-webinfo.git
```

## 2) Enable Pages
1. GitHub repo -> Settings -> Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / folder: `/root`
4. Save

## 3) Custom domain
- `CNAME` file is already included with `uma.kirius.kr`
- In Pages settings, set custom domain to `uma.kirius.kr`

DNS examples:
- For apex domain (`uma.kirius.kr`) -> `A` records to GitHub Pages IPs:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- If using subdomain style with CNAME support from DNS provider:
  - `uma.kirius.kr CNAME ccjy2181.github.io`

After DNS propagation, HTTPS can be enabled in Pages.
