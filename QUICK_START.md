# 🚀 Attend Ease - Quick Start Guide

## ✅ System is Running!

**Backend:** http://localhost:3000  
**Frontend:** http://localhost:5173  
**API Docs:** http://localhost:3000/api/docs

---

## 🔐 Login Credentials

### Admin
```
Email: admin@attendease.com
Password: admin123
```

### Employee (Example)
```
Email: citseed100@attendease.com
Password: employee123
```

**All employees:** `{employeeId}@attendease.com` / `employee123`

---

## 📊 What's Available

### For Employees
- ✅ View attendance (December 2025) — calendar & table views
- ✅ Download salary slips (PDF/Excel)
- ✅ Apply for casual leave
- ✅ View leave balance
- ✅ View announcements

### For Admins (via UI & API)
- ✅ Manage users
- ✅ Generate payroll
- ✅ Approve leaves
- ✅ View reports
- ✅ Manage holidays

---

## 🎯 Quick Tests

### 1. Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@attendease.com","password":"admin123"}'
```

### 2. View Employees
```bash
# Get token first, then:
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Download Salary Slip
- Login to frontend
- Click "Download PDF" or "Download Excel"

---

## 📈 December 2025 Data

- **Employees:** 251
- **Attendance Records:** 7,780
- **Biometric Logs:** 4,736
- **Payroll Generated:** 252 (₹4,768,248)

---

## 🔧 Restart Servers

### Backend
```bash
cd backend
npm run start:dev
```

### Frontend
```bash
cd frontend
npm run dev
```

---

## 📞 Support

If you need help:
1. Check `SYSTEM_REVIEW.md` for detailed documentation
2. Visit API docs: http://localhost:3000/api/docs
3. Check browser console (F12) for errors

---

**System Status:** ✅ OPERATIONAL  
**Last Updated:** February 6, 2026
