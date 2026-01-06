// Mock data for FundEd platform

export const categories = [
  { id: 'tuition', name: 'Tuition', icon: 'GraduationCap' },
  { id: 'books', name: 'Books & Materials', icon: 'BookOpen' },
  { id: 'laptop', name: 'Laptop & Equipment', icon: 'Laptop' },
  { id: 'housing', name: 'Housing', icon: 'Home' },
  { id: 'travel', name: 'Travel', icon: 'Plane' },
  { id: 'emergency', name: 'Emergency', icon: 'AlertCircle' }
];

export const countries = [
  'United States', 'United Kingdom', 'Canada', 'India', 'Australia', 
  'Germany', 'France', 'Nigeria', 'Kenya', 'Brazil', 'Mexico'
];

export const fieldsOfStudy = [
  'Computer Science', 'Engineering', 'Medicine', 'Business', 'Arts', 
  'Mathematics', 'Physics', 'Biology', 'Economics', 'Psychology'
];

export const mockStudents = [
  {
    id: 'student_1',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    country: 'Kenya',
    fieldOfStudy: 'Computer Science',
    university: 'University of Nairobi',
    verificationStatus: 'verified',
    story: 'I am a final-year computer science student passionate about building solutions for rural communities. Coming from a small village, I understand the challenges of limited access to technology and education. My dream is to create educational platforms that can reach underserved areas.',
    targetAmount: 5000,
    raisedAmount: 3200,
    category: 'tuition',
    timeline: '6 months',
    documents: [
      { type: 'Student ID', verified: true },
      { type: 'Acceptance Letter', verified: true },
      { type: 'Transcript', verified: true }
    ],
    createdAt: '2025-01-15',
    impactLog: 'Will complete my degree and develop educational software for rural schools',
    donors: [
      { name: 'John Doe', amount: 500, date: '2025-02-10', anonymous: false },
      { name: 'Anonymous', amount: 200, date: '2025-02-12', anonymous: true },
      { name: 'Tech Foundation', amount: 1000, date: '2025-02-15', anonymous: false },
      { name: 'Maria Garcia', amount: 300, date: '2025-02-18', anonymous: false },
      { name: 'Anonymous', amount: 150, date: '2025-02-20', anonymous: true },
      { name: 'David Chen', amount: 1050, date: '2025-02-22', anonymous: false }
    ]
  },
  {
    id: 'student_2',
    name: 'Raj Patel',
    email: 'raj.p@email.com',
    picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    country: 'India',
    fieldOfStudy: 'Medicine',
    university: 'All India Institute of Medical Sciences',
    verificationStatus: 'verified',
    story: 'Growing up in a rural area with limited healthcare facilities, I witnessed firsthand the importance of accessible medical care. I am dedicated to becoming a doctor who can serve underserved communities and make healthcare a reality for everyone.',
    targetAmount: 8000,
    raisedAmount: 5600,
    category: 'tuition',
    timeline: '12 months',
    documents: [
      { type: 'Student ID', verified: true },
      { type: 'Acceptance Letter', verified: true },
      { type: 'Medical School Enrollment', verified: true }
    ],
    createdAt: '2025-01-10',
    impactLog: 'Will serve in rural healthcare after graduation',
    donors: [
      { name: 'Health Alliance', amount: 2000, date: '2025-01-20', anonymous: false },
      { name: 'Anonymous', amount: 500, date: '2025-01-25', anonymous: true },
      { name: 'Dr. Smith', amount: 1500, date: '2025-02-01', anonymous: false },
      { name: 'Community Fund', amount: 1600, date: '2025-02-10', anonymous: false }
    ]
  },
  {
    id: 'student_3',
    name: 'Emily Chen',
    email: 'emily.c@email.com',
    picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    country: 'United States',
    fieldOfStudy: 'Engineering',
    university: 'MIT',
    verificationStatus: 'pending',
    story: 'As a first-generation college student, I am pursuing my dream of becoming an aerospace engineer. I need support to purchase essential equipment and materials for my research project on sustainable aviation.',
    targetAmount: 3500,
    raisedAmount: 800,
    category: 'laptop',
    timeline: '4 months',
    documents: [
      { type: 'Student ID', verified: false },
      { type: 'Acceptance Letter', verified: false },
      { type: 'Project Proposal', verified: false }
    ],
    createdAt: '2025-02-20',
    impactLog: 'Research on sustainable aviation technologies',
    donors: [
      { name: 'Aviation Corp', amount: 500, date: '2025-02-22', anonymous: false },
      { name: 'Anonymous', amount: 300, date: '2025-02-23', anonymous: true }
    ]
  },
  {
    id: 'student_4',
    name: 'Ahmed Hassan',
    email: 'ahmed.h@email.com',
    picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    country: 'Nigeria',
    fieldOfStudy: 'Business',
    university: 'University of Lagos',
    verificationStatus: 'verified',
    story: 'I am passionate about social entrepreneurship and want to create businesses that solve local problems while generating employment. I need help covering my tuition and books for my final year.',
    targetAmount: 4000,
    raisedAmount: 4000,
    category: 'tuition',
    timeline: '8 months',
    documents: [
      { type: 'Student ID', verified: true },
      { type: 'Acceptance Letter', verified: true },
      { type: 'Business Plan', verified: true }
    ],
    createdAt: '2024-12-01',
    impactLog: 'Will establish social enterprises creating 50+ jobs',
    donors: [
      { name: 'Impact Investors', amount: 2000, date: '2024-12-10', anonymous: false },
      { name: 'Anonymous', amount: 1000, date: '2024-12-15', anonymous: true },
      { name: 'Business Angels', amount: 1000, date: '2024-12-20', anonymous: false }
    ]
  },
  {
    id: 'student_5',
    name: 'Maria Rodriguez',
    email: 'maria.r@email.com',
    picture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    country: 'Mexico',
    fieldOfStudy: 'Arts',
    university: 'Universidad Nacional Autónoma de México',
    verificationStatus: 'verified',
    story: 'I am studying digital arts and design to preserve and modernize traditional Mexican art forms. I need assistance with purchasing a professional laptop and design software to complete my thesis project.',
    targetAmount: 2500,
    raisedAmount: 1800,
    category: 'laptop',
    timeline: '3 months',
    documents: [
      { type: 'Student ID', verified: true },
      { type: 'Enrollment Letter', verified: true },
      { type: 'Portfolio', verified: true }
    ],
    createdAt: '2025-02-01',
    impactLog: 'Digital preservation of indigenous art forms',
    donors: [
      { name: 'Arts Foundation', amount: 800, date: '2025-02-05', anonymous: false },
      { name: 'Anonymous', amount: 500, date: '2025-02-10', anonymous: true },
      { name: 'Cultural Society', amount: 500, date: '2025-02-12', anonymous: false }
    ]
  },
  {
    id: 'student_6',
    name: 'David Kim',
    email: 'david.k@email.com',
    picture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    country: 'Canada',
    fieldOfStudy: 'Economics',
    university: 'University of Toronto',
    verificationStatus: 'pending',
    story: 'I am researching economic models for sustainable development in developing nations. I need help with housing costs while I complete my research fellowship.',
    targetAmount: 6000,
    raisedAmount: 1200,
    category: 'housing',
    timeline: '6 months',
    documents: [
      { type: 'Student ID', verified: false },
      { type: 'Fellowship Letter', verified: false }
    ],
    createdAt: '2025-02-18',
    impactLog: 'Economic development models for sustainable growth',
    donors: [
      { name: 'Anonymous', amount: 1200, date: '2025-02-20', anonymous: true }
    ]
  }
];

export const mockUsers = [
  {
    user_id: 'user_admin_1',
    email: 'admin@funded.com',
    name: 'Admin User',
    role: 'admin',
    picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
  },
  {
    user_id: 'user_donor_1',
    email: 'donor@email.com',
    name: 'John Doe',
    role: 'donor',
    picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    donations: [
      { studentId: 'student_1', amount: 500, date: '2025-02-10' }
    ]
  }
];

export const verificationStatuses = {
  pending: {
    label: 'Pending Verification',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: 'Clock'
  },
  verified: {
    label: 'Verified Student',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: 'CheckCircle2'
  },
  rejected: {
    label: 'Verification Rejected',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: 'XCircle'
  }
};
