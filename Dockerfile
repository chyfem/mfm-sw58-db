FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 8000
CMD ["node", "backend/server.js"]
```

Click **"Commit new file"**

### Step 6 — Deploy
1. Go back to Back4app
2. Click **"Deploy"**
3. Wait 3–5 minutes
4. Your app goes live at a Back4app URL

### Step 7 — Run Setup Script
1. In Back4app dashboard → click your app
2. Click **"Console"** or **"Shell"**
3. Run:
```
node setup.js
```

### Step 8 — Login
Go to your Back4app URL:
```
https://YOUR-APP.b4a.run/pages/login.html
