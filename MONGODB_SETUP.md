# MongoDB Atlas Setup for Task Manager Project

This guide will help you create a new MongoDB Atlas cluster specifically for the Task Manager project.

## 🚀 Step-by-Step Setup

### 1. Create a New MongoDB Atlas Account/Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign in to your existing account or create a new one
3. Click **"Build a Database"** or **"Create Cluster"**

### 2. Configure the New Cluster

**Cluster Settings:**
- **Cloud Provider**: Choose AWS, Google Cloud, or Azure
- **Region**: Select a region closest to you (recommended: Mumbai, Singapore, or US East)
- **Cluster Tier**: 
  - For development: **M0 Sandbox** (Free)
  - For production: **M2+** (paid)
- **Cluster Name**: `task-manager-cluster`

### 3. Create Database User

1. Go to **Database Access** in the left sidebar
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `taskmanager_user`
5. **Password**: Generate a strong password (save it securely)
6. **Privileges**: 
   - Check **"Read and write to any database"**
   - OR specify specific database privileges

### 4. Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"** (0.0.0.0/0) for development
4. For production, add your specific IP addresses

### 5. Get Connection String

1. Go to **Database** in the left sidebar
2. Click **"Connect"** on your new cluster
3. Select **"Drivers"**
4. Copy the connection string

### 6. Update Your Project Configuration

Replace the connection string in `/server/.env`:

```env
MONGODB_URI=mongodb+srv://taskmanager_user:YOUR_PASSWORD@task-manager-cluster.mongodb.net/taskmanager
```

**Important:**
- Replace `YOUR_PASSWORD` with the actual password you created
- The database name `taskmanager` will be created automatically

### 7. Update Environment Variables

Make sure your `.env` file looks like this:

```env
PORT=5000
MONGODB_URI=mongodb+srv://taskmanager_user:YOUR_PASSWORD@task-manager-cluster.mongodb.net/taskmanager
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

## 🔧 Testing the Connection

After updating the `.env` file, test the connection:

```bash
cd server
node index.js
```

You should see:
```
Connected to MongoDB
Server running on port 5000
```

## 📊 Database Structure

The following collections will be automatically created:

- **users** - User accounts and authentication
- **projects** - Project information and members
- **tasks** - Task details and assignments

## 🛡️ Security Best Practices

### For Development:
- Allow access from anywhere (0.0.0.0/0)
- Use read/write permissions for all databases

### For Production:
- Restrict IP access to specific addresses
- Create specific database users with limited permissions
- Enable SSL/TLS encryption
- Set up database backups
- Monitor performance and costs

## 💡 Additional Features

### Enable MongoDB Atlas Features:
1. **Real-time Performance Monitoring**
2. **Automatic Backups**
3. **Data Encryption**
4. **Performance Advisor**
5. **Query Optimization**

### Index Creation (Automatic):
The application will automatically create necessary indexes for:
- User email/username lookups
- Project queries
- Task searches
- Performance optimization

## 🚨 Troubleshooting

### Common Issues:

**"Connection refused"**
- Check if the cluster is running
- Verify IP access settings
- Confirm username/password

**"Authentication failed"**
- Verify database user credentials
- Check if user has proper permissions
- Ensure password is correctly escaped

**"Network timeout"**
- Check network connectivity
- Verify firewall settings
- Try different connection method

### Connection String Format:
```
mongodb+srv://username:password@cluster-name.mongodb.net/database-name
```

## 📞 Support

If you encounter issues:
1. Check MongoDB Atlas documentation
2. Verify cluster status in Atlas dashboard
3. Review connection logs
4. Test with MongoDB Compass (GUI tool)

---

**Your new cluster will be ready for the Task Manager application!** 🎉
