import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, onSnapshot, collection, query, where, deleteDoc } from 'firebase/firestore';

// Lucide-react for icons
import { Wrench, Zap, Home, Droplet, Shirt, UserPlus, X, Briefcase, DollarSign, MessageSquare, CheckCircle2, User, Users, List, Phone, MessageCircleMore, Key, DoorOpen, CornerDownLeft, Plus, MapPin, Bell, Star, Clock, Heart, Edit, FileText, LayoutGrid, Brain, Hash, Award, Group, Mic, CheckCircle, Gift, RefreshCcw, Book, Map, BriefcaseBusiness, Gavel, ScanText, TrendingUp, BarChart4 } from 'lucide-react';

// Main application component
const App = () => {
  // Main app state for authentication and user role
  const [user, setUser] = useState({ isLoggedIn: false, role: null, uid: null });
  
  // Login-specific states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // App-wide data and loading states
  const [allUsers, setAllUsers] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [communityProjects, setCommunityProjects] = useState([]);
  const [communityAreas, setCommunityAreas] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // Geolocation state
  const [location, setLocation] = useState(null);
  
  // Other app states
  const [isRequestingService, setIsRequestingService] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isServiceProviderOnboarding, setIsServiceProviderOnboarding] = useState(false);
  const [isViewingChat, setIsViewingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatPartner, setChatPartner] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [favoriteProviders, setFavoriteProviders] = useState([]);
  const [jobTemplates, setJobTemplates] = useState([]);
  const [selectedCommunityArea, setSelectedCommunityArea] = useState(null);

  // Admin-specific state
  const [activeAdminTab, setActiveAdminTab] = useState('providers');
  const [activeResidentTab, setActiveResidentTab] = useState('home');
  const [activeSPTab, setActiveSPTab] = useState('available-jobs');

  // Search and filter states
  const [residentSearchQuery, setResidentSearchQuery] = useState('');
  const [spSearchQuery, setSpSearchQuery] = useState('');

  // AI Tagging states
  const [jobDescription, setJobDescription] = useState('');
  const [aiTags, setAiTags] = useState([]);
  const [isAITagging, setIsAITagging] = useState(false);
  
  // Custom modal for alerts
  const [modalContent, setModalContent] = useState(null);
  const closeModal = () => setModalContent(null);
  
  // Firebase state
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // New state to track auth readiness

  // App ID for Firestore
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    const firebaseConfig = {
                apiKey: "AIzaSyBgn6En99KEfSAJHathTYGeYYTfBBxhO7A",
                authDomain: "aihuman-b71a8.firebaseapp.com",
                databaseURL: "https://aihuman-b71a8-default-rtdb.firebaseio.com",
                projectId: "aihuman-b71a8",
                storageBucket: "aihuman-b71a8.firebasestorage.app",
                messagingSenderId: "611379386902",
                appId: "1:611379386902:web:858045aa231ddc67f17337",
                measurementId: "G-95ZBMYKFKC"       
            };

    const app = initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);

    setDb(dbInstance);
    setAuth(authInstance);

    // This listener is crucial for handling both new sign-ins and existing sessions.
    const unsubscribe = onAuthStateChanged(authInstance, async (authUser) => {
      if (authUser) {
        const userRef = doc(dbInstance, `/artifacts/${appId}/users`, authUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({ isLoggedIn: true, role: userData.role, uid: authUser.uid });
          setLocation(userData.location || null);
          setIsNewUser(false);
          setFavoriteProviders(userData.favoriteProviders || []);
          setJobTemplates(userData.jobTemplates || []);
          setSelectedCommunityArea(userData.units?.[0] || null);
        } else {
          // A user is signed in (e.g., via Google), but no role is assigned yet.
          setUser({ isLoggedIn: true, role: null, uid: authUser.uid });
          setIsNewUser(true);
        }
      } else {
        setUser({ isLoggedIn: false, role: null, uid: null });
        setIsNewUser(false);
      }
      setIsAuthReady(true); // Signal that auth state has been checked
    });

    return () => unsubscribe();
  }, []);

  // --- Real-time Data Fetching ---
  useEffect(() => {
    if (db && user.isLoggedIn) {
      const usersQuery = collection(db, `/artifacts/${appId}/users`);
      const usersUnsub = onSnapshot(usersQuery, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllUsers(users);
      });

      const pendingProvidersQuery = query(collection(db, `/artifacts/${appId}/providers`), where("status", "==", "pending"));
      const pendingUnsub = onSnapshot(pendingProvidersQuery, (snapshot) => {
        const providers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingProviders(providers);
      });
      
      const jobsQuery = collection(db, `/artifacts/${appId}/jobs`);
      const jobsUnsub = onSnapshot(jobsQuery, (snapshot) => {
        const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllJobs(jobs);
      });
      
      const quotesQuery = collection(db, `/artifacts/${appId}/quotes`);
      const quotesUnsub = onSnapshot(quotesQuery, (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuotes(quotesData);
      });

      const reviewsQuery = collection(db, `/artifacts/${appId}/reviews`);
      const reviewsUnsub = onSnapshot(reviewsQuery, (snapshot) => {
        const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(reviewsData);
      });

      const announcementsQuery = collection(db, `/artifacts/${appId}/announcements`);
      const announcementsUnsub = onSnapshot(announcementsQuery, (snapshot) => {
        const annos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(annos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      });

      const serviceCatalogQuery = collection(db, `/artifacts/${appId}/serviceCatalog`);
      const catalogUnsub = onSnapshot(serviceCatalogQuery, (snapshot) => {
        const catalog = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServiceCatalog(catalog);
      });
      
      const communityPostsQuery = collection(db, `/artifacts/${appId}/communityPosts`);
      const communityUnsub = onSnapshot(communityPostsQuery, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCommunityPosts(posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      });

      const eventsQuery = collection(db, `/artifacts/${appId}/events`);
      const eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
        const evs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(evs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      });

      const feedbackQuery = collection(db, `/artifacts/${appId}/feedback`);
      const feedbackUnsub = onSnapshot(feedbackQuery, (snapshot) => {
        const fb = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeedback(fb.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      });

      const projectsQuery = collection(db, `/artifacts/${appId}/communityProjects`);
      const projectsUnsub = onSnapshot(projectsQuery, (snapshot) => {
        const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCommunityProjects(projs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      });
      
      const areasQuery = collection(db, `/artifacts/${appId}/communityAreas`);
      const areasUnsub = onSnapshot(areasQuery, (snapshot) => {
        const areas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCommunityAreas(areas.sort((a, b) => a.name.localeCompare(b.name)));
      });

      const subscriptionsQuery = collection(db, `/artifacts/${appId}/subscriptions`);
      const subscriptionsUnsub = onSnapshot(subscriptionsQuery, (snapshot) => {
        const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubscriptions(subs);
      });

      return () => {
        usersUnsub();
        pendingUnsub();
        jobsUnsub();
        announcementsUnsub();
        quotesUnsub();
        reviewsUnsub();
        catalogUnsub();
        communityUnsub();
        eventsUnsub();
        feedbackUnsub();
        projectsUnsub();
        areasUnsub();
        subscriptionsUnsub();
      };
    }
  }, [db, user.isLoggedIn]);
  
  // --- Geolocation and Map Logic ---
  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          setLocation(newLocation);
          if (db && user.uid) {
            const userRef = doc(db, `/artifacts/${appId}/users`, user.uid);
            updateDoc(userRef, { location: newLocation });
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setModalContent({ title: "Location Error", message: "Unable to retrieve your location. Please enable location services for this app." });
        }
      );
    } else {
      setModalContent({ title: "Geolocation Not Supported", message: "Geolocation is not supported by your browser." });
    }
  };
  
  // --- Login/Logout Functions ---
  const handleSendOtp = async (selectedRole) => {
    if (phoneNumber.length >= 10 && auth) {
      setModalContent({ title: "OTP Sent", message: `A simulated OTP has been sent to ${phoneNumber}. Please enter '123456' to log in as a ${selectedRole}.` });
      setOtpSent(true);
      setUser(prev => ({ ...prev, role: selectedRole }));
    } else {
      setModalContent({ title: "Invalid Phone Number", message: 'Please enter a valid phone number.' });
    }
  };

  const handleVerifyOtp = async () => {
    setIsVerifyingOtp(true);
    if (otp === '123456') {
      try {
        await signInAnonymously(auth);
        const userRef = doc(db, `/artifacts/${appId}/users`, auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            role: user.role,
            name: `User-${auth.currentUser.uid.substring(0, 5)}`,
            phoneNumber: phoneNumber,
            location: location,
            bio: '',
            portfolio: [],
            availability: 'Mon-Fri, 9am-5pm',
            units: [],
            serviceAreas: [],
          });
        }
        setOtpSent(false);
        setOtp('');
      } catch (error) {
        console.error("Error signing in or creating user:", error);
        setModalContent({ title: "Login Error", message: 'An error occurred during login.' });
      } finally {
        setIsVerifyingOtp(false);
      }
    } else {
      setModalContent({ title: "Invalid OTP", message: 'Invalid OTP. Please try again.' });
      setIsVerifyingOtp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInWithGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      const userRef = doc(db, `/artifacts/${appId}/users`, googleUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          role: 'unassigned',
          name: googleUser.displayName,
          email: googleUser.email,
          phoneNumber: googleUser.phoneNumber || null,
          createdAt: new Date().toISOString(),
          bio: '',
          portfolio: [],
          availability: 'Mon-Fri, 9am-5pm',
          units: [],
          serviceAreas: [],
        });
      }
      
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setModalContent({ title: "Sign-in Failed", message: 'Failed to sign in with Google.' });
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  const handleNewUserRoleSelection = async (selectedRole) => {
    if (auth.currentUser && db) {
      try {
        const userRef = doc(db, `/artifacts/${appId}/users`, auth.currentUser.uid);
        await updateDoc(userRef, { role: selectedRole });
        setUser(prev => ({ ...prev, role: selectedRole }));
        setIsNewUser(false);
        setModalContent({ title: "Role Selected", message: `You are now a ${selectedRole}. Welcome!` });
      } catch (error) {
        console.error("Error selecting new user role:", error);
        setModalContent({ title: "Error", message: "Failed to set your role. Please try again." });
      }
    }
  };
  
  const handleLogout = async () => {
    await auth.signOut();
    setUser({ isLoggedIn: false, role: null, uid: null });
    setPhoneNumber('');
    setOtpSent(false);
    setOtp('');
    setLocation(null);
  };

  // --- AI Tagging Logic ---
  const handleAITagging = async () => {
    if (!jobDescription.trim()) return;

    setIsAITagging(true);
    try {
      const serviceNames = serviceCatalog.map(s => s.name).join(', ');
      const prompt = `Based on the following job description, identify the most relevant service categories and tags from this list: ${serviceNames}.
      Job Description: "${jobDescription}"
      Respond in a JSON format with a single key "tags" containing an array of strings. Example: {"tags": ["Plumbing", "Leaky Faucet"]}`;
      
      const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: "OBJECT",
                  properties: {
                      "tags": {
                          "type": "ARRAY",
                          "items": { "type": "STRING" }
                      }
                  }
              }
          }
      };
      
      const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=';
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      const result = await response.json();
      const generatedTags = JSON.parse(result.candidates[0].content.parts[0].text).tags;
      setAiTags(generatedTags);
    } catch (error) {
      console.error('Error generating tags:', error);
      setModalContent({ title: "Tagging Error", message: 'Failed to generate tags. Please try again.' });
    } finally {
      setIsAITagging(false);
    }
  };

  // --- Resident Functions ---
  const handleOpenRequest = (service) => {
    setSelectedService(service);
    setIsRequestingService(true);
  };

  const handleCloseRequest = () => {
    setIsRequestingService(false);
    setSelectedService(null);
    setJobDescription('');
    setAiTags([]);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    const jobData = {
      service: selectedService.name,
      description: jobDescription,
      tags: aiTags,
      residentUid: user.uid,
      residentName: allUsers.find(u => u.id === user.uid)?.name || 'Resident',
      status: 'pending',
      date: new Date().toISOString(),
      unit: e.target.unit.value,
      docs: [], // Conceptual
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/jobs`), jobData);
      setModalContent({ title: "Request Submitted", message: 'Your service request has been submitted!' });
      handleCloseRequest();
    } catch (error) {
      console.error("Error submitting job:", error);
      setModalContent({ title: "Submission Error", message: 'Failed to submit request. Please try again.' });
    }
  };

  const handleAcceptQuote = async (jobId, quoteId) => {
    try {
      const jobRef = doc(db, `/artifacts/${appId}/jobs`, jobId);
      await updateDoc(jobRef, { status: 'accepted', acceptedQuoteId: quoteId });
      // Mock for quality assurance follow-up
      setTimeout(() => {
        setModalContent({ title: "Proactive Follow-up", message: `A day has passed since Job ${jobId} was marked as accepted. Please leave a review for the service provider.` });
      }, 24 * 60 * 60 * 1000);
      setModalContent({ title: "Quote Accepted", message: 'Quote accepted! The service provider has been notified.' });
    } catch (error) {
      console.error("Error accepting quote:", error);
      setModalContent({ title: "Error", message: 'Failed to accept quote.' });
    }
  };

  const handleRejectQuote = async (jobId, quoteId) => {
    try {
      const quoteRef = doc(db, `/artifacts/${appId}/quotes`, quoteId);
      await updateDoc(quoteRef, { status: 'rejected' });
      setModalContent({ title: "Quote Rejected", message: 'Quote rejected.' });
    } catch (error) {
      console.error("Error rejecting quote:", error);
      setModalContent({ title: "Error", message: 'Failed to reject quote.' });
    }
  };
  
  const handlePostReview = async (e, job, providerId) => {
    e.preventDefault();
    const reviewData = {
      jobId: job.id,
      residentUid: user.uid,
      providerUid: providerId,
      rating: parseInt(e.target.rating.value, 10),
      comment: e.target.comment.value,
      timestamp: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/reviews`), reviewData);
      const jobRef = doc(db, `/artifacts/${appId}/jobs`, job.id);
      await updateDoc(jobRef, { status: 'completed' });
      setModalContent({ title: "Review Submitted", message: 'Review submitted successfully!' });
    } catch (error) {
      console.error('Error posting review:', error);
      setModalContent({ title: "Review Error", message: 'Failed to post review. Please try again.' });
    }
  };

  const handleAddFavoriteProvider = async (providerId) => {
    const userRef = doc(db, `/artifacts/${appId}/users`, user.uid);
    const updatedFavorites = [...favoriteProviders, providerId];
    await updateDoc(userRef, { favoriteProviders: updatedFavorites });
    setFavoriteProviders(updatedFavorites);
    setModalContent({ title: "Provider Added", message: 'Provider added to favorites!' });
  };

  const handleSaveJobTemplate = async (job) => {
    const userRef = doc(db, `/artifacts/${appId}/users`, user.uid);
    const newTemplate = {
      service: job.service,
      description: job.description,
      tags: job.tags,
      unit: job.unit,
    };
    const updatedTemplates = [...jobTemplates, newTemplate];
    await updateDoc(userRef, { jobTemplates: updatedTemplates });
    setJobTemplates(updatedTemplates);
    setModalContent({ title: "Template Saved", message: 'Job saved as a template!' });
  };

  // --- Service Provider Functions ---
  const handleViewQuote = (job) => {
    setSelectedJob(job);
    setIsQuoting(true);
  };

  const handleBackToJobs = () => {
    setIsQuoting(false);
    setSelectedJob(null);
  };
  
  const handleQuoteSubmission = async (e) => {
    e.preventDefault();
    const quoteData = {
      jobId: selectedJob.id,
      providerUid: user.uid,
      providerName: allUsers.find(u => u.id === user.uid)?.name || 'SP',
      quoteAmount: e.target.quote.value,
      message: e.target.message.value,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/quotes`), quoteData);
      const jobRef = doc(db, `/artifacts/${appId}/jobs`, selectedJob.id);
      await updateDoc(jobRef, { status: 'quoted' });
      setModalContent({ title: "Quote Submitted", message: 'Your quote has been submitted to the resident!' });
      handleBackToJobs();
    } catch (error) {
      console.error("Error submitting quote:", error);
      setModalContent({ title: "Submission Error", message: 'Failed to submit quote. Please try again.' });
    }
  };

  // Service Provider Onboarding Functions
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    const newProvider = {
      name: e.target.name.value,
      service: e.target.service.value,
      phone: e.target.phone.value,
      status: 'pending',
      location: location,
      serviceAreas: e.target.serviceAreas.value.split(',').map(s => s.trim()),
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/providers`), newProvider);
      setModalContent({ title: "Registration Successful", message: 'Thank you for registering! An admin will review your profile.' });
      setIsServiceProviderOnboarding(false);
      handleLogout();
    } catch (error) {
      console.error("Error registering provider:", error);
      setModalContent({ title: "Registration Error", message: 'Failed to register. Please try again.' });
    }
  };

  const handlePostCommunityPost = async (e) => {
    e.preventDefault();
    const postData = {
      title: e.target.title.value,
      content: e.target.content.value,
      authorId: user.uid,
      authorName: allUsers.find(u => u.id === user.uid)?.name || 'Provider',
      timestamp: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/communityPosts`), postData);
      setModalContent({ title: "Post Submitted", message: 'Post submitted successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error posting to community:", error);
      setModalContent({ title: "Post Error", message: 'Failed to post to community. Please try again.' });
    }
  };
  
  // --- Admin Functions ---
  const handleApproveProvider = async (providerId) => {
    try {
      const providerRef = doc(db, `/artifacts/${appId}/providers`, providerId);
      await updateDoc(providerRef, { status: 'approved' });
      setModalContent({ title: "Provider Approved", message: 'Service provider approved!' });
    } catch (error) {
      console.error("Error approving provider:", error);
      setModalContent({ title: "Approval Error", message: 'Failed to approve provider. Please try again.' });
    }
  };
  
  const handleRejectProvider = async (providerId) => {
    try {
      const providerRef = doc(db, `/artifacts/${appId}/providers`, providerId);
      await deleteDoc(providerRef);
      setModalContent({ title: "Provider Rejected", message: 'Service provider rejected!' });
    } catch (error) {
      console.error("Error rejecting provider:", error);
      setModalContent({ title: "Rejection Error", message: 'Failed to reject provider. Please try again.' });
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const userData = {
      name: e.target.name.value,
      role: e.target.role.value,
      email: e.target.email.value,
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/users`), userData);
      setModalContent({ title: "User Added", message: 'User added successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error adding user:", error);
      setModalContent({ title: "User Error", message: 'Failed to add user. Please try again.' });
    }
  };
  
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    const announcementData = {
      title: e.target.title.value,
      content: e.target.content.value,
      timestamp: new Date().toISOString(),
      adminName: allUsers.find(u => u.id === user.uid)?.name || 'Admin',
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/announcements`), announcementData);
      setModalContent({ title: "Announcement Posted", message: 'Announcement posted successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error posting announcement:", error);
      setModalContent({ title: "Announcement Error", message: 'Failed to post announcement.' });
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    const serviceData = {
      category: e.target.category.value,
      name: e.target.name.value,
      description: e.target.description.value,
      icon: e.target.icon.value,
      createdAt: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/serviceCatalog`), serviceData);
      setModalContent({ title: "Service Added", message: 'Service added successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error adding service:", error);
      setModalContent({ title: "Service Error", message: 'Failed to add service.' });
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    const eventData = {
      title: e.target.title.value,
      description: e.target.description.value,
      date: e.target.date.value,
      location: e.target.location.value,
      timestamp: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/events`), eventData);
      setModalContent({ title: "Event Added", message: 'Event added successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error adding event:", error);
      setModalContent({ title: "Event Error", message: 'Failed to add event.' });
    }
  };

  const handleAddFeedback = async (e) => {
    e.preventDefault();
    const feedbackData = {
      title: e.target.title.value,
      content: e.target.content.value,
      timestamp: new Date().toISOString(),
      author: allUsers.find(u => u.id === user.uid)?.name || 'User',
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/feedback`), feedbackData);
      setModalContent({ title: "Feedback Submitted", message: 'Feedback submitted!' });
      e.target.reset();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setModalContent({ title: "Feedback Error", message: 'Failed to submit feedback.' });
    }
  };
  
  const handleAddProject = async (e) => {
    e.preventDefault();
    const projectData = {
      title: e.target.title.value,
      description: e.target.description.value,
      area: e.target.area.value,
      status: 'planning',
      timestamp: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/communityProjects`), projectData);
      setModalContent({ title: "Project Added", message: 'Community Project added successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error adding project:", error);
      setModalContent({ title: "Project Error", message: 'Failed to add project.' });
    }
  };

  const handleAddCommunityArea = async (e) => {
    e.preventDefault();
    const areaData = {
      name: e.target.name.value,
      region: e.target.region.value,
      description: e.target.description.value,
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/communityAreas`), areaData);
      setModalContent({ title: "Area Added", message: 'Community Area added successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error adding area:", error);
      setModalContent({ title: "Area Error", message: 'Failed to add area.' });
    }
  };

  const handleAddSubscriptionPlan = async (e) => {
    e.preventDefault();
    const planData = {
      name: e.target.name.value,
      role: e.target.role.value,
      price: parseFloat(e.target.price.value),
      benefits: e.target.benefits.value.split(',').map(s => s.trim()),
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/subscriptions`), planData);
      setModalContent({ title: "Plan Added", message: 'Subscription plan added successfully!' });
      e.target.reset();
    } catch (error) {
      console.error("Error adding plan:", error);
      setModalContent({ title: "Plan Error", message: 'Failed to add subscription plan.' });
    }
  };

  // --- Real-time Messaging Functions & Component ---
  useEffect(() => {
    if (db && user.isLoggedIn) {
      const allChats = allJobs.filter(job => job.residentUid === user.uid || (job.acceptedQuoteId && allUsers.find(u => u.id === user.uid)?.role === 'serviceProvider')).map(job => {
        const chatId = [job.residentUid, job.providerUid].sort().join('_');
        return chatId;
      });
      setUnreadMessages(allChats.length); 
    }
  }, [db, user.isLoggedIn, allJobs, allUsers]);

  const handleOpenChat = async (jobId) => {
    setIsViewingChat(true);
    const job = allJobs.find(j => j.id === jobId);
    if (job) {
      const chatPartnerUid = user.role === 'resident' ? allUsers.find(u => u.role === 'serviceProvider')?.id : job.residentUid;
      const chatPartnerName = allUsers.find(u => u.id === chatPartnerUid)?.name || 'User';
      setChatPartner({ uid: chatPartnerUid, name: chatPartnerName });
    }
  };

  useEffect(() => {
    if (db && isViewingChat && user.uid && chatPartner) {
      const chatId = [user.uid, chatPartner.uid].sort().join('_');
      const messagesQuery = collection(db, `/artifacts/${appId}/chats/${chatId}/messages`);
      const unsub = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChatMessages(messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      });
      return () => unsub();
    }
  }, [db, isViewingChat, user.uid, chatPartner]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = e.target.message.value;
    if (!messageText.trim()) return;

    const chatId = [user.uid, chatPartner.uid].sort().join('_');
    const message = {
      text: messageText,
      senderUid: user.uid,
      timestamp: new Date().toISOString(),
    };
    
    try {
      await addDoc(collection(db, `/artifacts/${appId}/chats/${chatId}/messages`), message);
      e.target.reset();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const ChatWindow = () => (
    <div className="flex flex-col h-[70vh] bg-white rounded-xl shadow-inner p-4">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-xl font-semibold">Chat with {chatPartner?.name || 'User'}</h2>
        <button onClick={() => setIsViewingChat(false)} className="text-gray-500 hover:text-red-500">
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto my-4 space-y-4">
        {chatMessages.length === 0 && <p className="text-center text-gray-400">No messages yet. Say hello!</p>}
        {chatMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.senderUid === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-xl p-3 max-w-sm ${msg.senderUid === user.uid ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
              <p>{msg.text}</p>
              <span className="block text-right text-xs opacity-75 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input type="text" name="message" placeholder="Type a message..." className="flex-1 p-2 border rounded-lg" />
        <button type="submit" className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700">
          <CornerDownLeft size={24} />
        </button>
      </form>
    </div>
  );

  const getPartnerName = (uid) => {
    return allUsers.find(u => u.id === uid)?.name || 'User';
  };
  
  const getServiceFromId = (jobId) => {
    return allJobs.find(job => job.id === jobId)?.service || 'N/A';
  }

  // --- Profile Component ---
  const ProfileView = ({ profileUser, onBack }) => {
    const isCurrentUser = profileUser.id === user.uid;
    const isServiceProvider = profileUser.role === 'serviceProvider';
    const userReviews = reviews.filter(r => r.providerUid === profileUser.id);
    const avgRating = userReviews.length > 0 ? (userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1) : 'N/A';
    
    // Mock for badges
    const badges = [];
    if (userReviews.length > 5) badges.push({ name: 'Top Rated', icon: Award });
    if (isServiceProvider && allJobs.filter(j => j.acceptedQuoteId && quotes.find(q => q.id === j.acceptedQuoteId)?.providerUid === profileUser.id).length > 10) badges.push({ name: '10+ Jobs Completed', icon: CheckCircle });
    if (profileUser.serviceAreas?.length > 1) badges.push({ name: 'Multi-Location Pro', icon: MapPin });

    return (
      <div className="p-6 bg-gray-50 rounded-xl shadow-inner relative">
        <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
        <div className="flex items-center space-x-4 mb-6">
          <User size={64} className="text-gray-500 bg-gray-200 p-2 rounded-full" />
          <div>
            <h2 className="text-3xl font-bold">{profileUser.name}</h2>
            <p className="text-lg text-gray-600 capitalize">{profileUser.role}</p>
          </div>
        </div>

        {isServiceProvider && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <span className="text-xl font-semibold">Rating: {avgRating}</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className={i < avgRating ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
                ))}
              </div>
              <span className="text-sm text-gray-500">({userReviews.length} reviews)</span>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Badges</h3>
              <div className="flex space-x-2">
                {badges.length > 0 ? (
                  badges.map((badge, i) => (
                    <div key={i} className="flex items-center space-x-1 p-2 bg-yellow-100 rounded-full">
                      <badge.icon size={16} className="text-yellow-500" />
                      <span className="text-sm text-yellow-800">{badge.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No badges yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">About Me</h3>
              <p className="text-gray-600">{profileUser.bio || 'This user has not yet added a bio.'}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">My Services</h3>
              <ul className="list-disc list-inside space-y-1">
                {profileUser.serviceTypes?.map(service => <li key={service}>{service}</li>) || 'No services listed.'}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Custom modal component for alerts
  const Modal = ({ title, message, onClose }) => {
    if (!message) return null;
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-700">{message}</p>
          <div className="mt-4 text-right">
            <button onClick={onClose} className="py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Universal Dashboard Component ---
  const Dashboard = () => {
    // Renders the main dashboard content based on role
    let content;
    if (user.role === 'resident') {
      content = renderResidentDashboard();
    } else if (user.role === 'serviceProvider') {
      content = renderServiceProviderDashboard();
    } else if (user.role === 'admin') {
      content = renderAdminDashboard();
    }

    // NEW: Combined back navigation and main dashboard view for cleaner rendering
    return (
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 capitalize">{user.role} Dashboard</h1>
          <div className="flex items-center space-x-4">
            {isViewingChat || isViewingProfile || isRequestingService || isQuoting ? (
              <button onClick={() => { setIsViewingChat(false); setIsViewingProfile(false); setIsRequestingService(false); setIsQuoting(false); }} className="text-purple-600 hover:text-purple-800 transition-colors flex items-center">
                <CornerDownLeft size={20} className="mr-2" />
                Go Back
              </button>
            ) : (
              user.isLoggedIn && (
                <div className="relative">
                  <MessageSquare size={28} className="text-gray-600" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">{unreadMessages}</span>
                  )}
                </div>
              )
            )}
            <button onClick={handleLogout} className="text-purple-600 hover:text-purple-800 transition-colors flex items-center">
              <DoorOpen size={20} className="mr-2" />
              Logout
            </button>
          </div>
        </div>
        {isViewingChat && <ChatWindow />}
        {isViewingProfile && <ProfileView profileUser={viewedProfile} onBack={() => setIsViewingProfile(false)} />}
        {isRequestingService && renderResidentRequestForm()}
        {isQuoting && renderSPQuoteForm()}
        {(!isViewingChat && !isViewingProfile && !isRequestingService && !isQuoting) && content}
      </div>
    );
  };
  
  // NEW: Extracted the main content blocks into their own functions for cleaner code
  const renderResidentRequestForm = () => (
    <div className="relative p-6 bg-gray-50 rounded-xl shadow-inner">
      <h2 className="text-2xl font-bold mb-4 text-center">Request a Service: {selectedService.name}</h2>
      <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <p className="text-gray-600 mt-1">{selectedService.description}</p>
      </div>
      <form onSubmit={handleSubmitRequest} className="space-y-4">
        <div><label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700">Job Description</label><textarea id="jobDescription" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows="3" required className="w-full p-2 mt-1 border rounded-lg"></textarea></div>
        <button type="button" onClick={handleAITagging} disabled={isAITagging} className={`w-full py-2 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center ${isAITagging ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
          <Brain size={20} className="mr-2" /> {isAITagging ? 'Generating tags...' : 'Generate AI Tags'}
        </button>
        {aiTags.length > 0 && (
          <div className="mt-2"><p className="text-sm font-medium text-gray-700">Suggested Tags:</p><div className="flex flex-wrap gap-2 mt-1">{aiTags.map((tag, i) => (<span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">{tag}</span>))}</div></div>
        )}
        <div><label htmlFor="unit" className="block text-sm font-medium text-gray-700">Your Unit</label><input type="text" id="unit" required className="w-full p-2 mt-1 border rounded-lg" placeholder="e.g., A-101" /></div>
        <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center">
          <Plus size={20} className="mr-2"/> Submit Request
        </button>
      </form>
    </div>
  );

  const renderSPQuoteForm = () => (
    <div className="relative p-6 bg-gray-50 rounded-xl shadow-inner">
      <h2 className="text-2xl font-bold mb-4 text-center">Submit a Quote</h2>
      <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <h3 className="text-lg font-semibold">{selectedJob.service}</h3>
        <p className="text-gray-600 mt-1">{selectedJob.description}</p>
        <p className="text-sm text-gray-500 mt-2">Requested by {selectedJob.residentName}</p>
      </div>
      <form onSubmit={handleQuoteSubmission} className="space-y-4">
        <div><label htmlFor="quote" className="block text-sm font-medium text-gray-700">Your Quote (in $)</label><input type="number" id="quote" required className="w-full p-2 mt-1 border rounded-lg" placeholder="e.g., 50" /></div>
        <div><label htmlFor="message" className="block text-sm font-medium text-gray-700">Message to Resident</label><textarea id="message" rows="3" className="w-full p-2 mt-1 border rounded-lg" placeholder="e.g., 'Hi, I'm available to do this job tomorrow morning. Let me know if that works for you.'"></textarea></div>
        <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Submit Quote</button>
      </form>
    </div>
  );

  const renderResidentDashboard = () => {
    const myJobs = allJobs.filter(job => job.residentUid === user.uid);
    const residentUser = allUsers.find(u => u.id === user.uid);
    const myUnits = residentUser?.units || [];

    const renderJobItem = (job) => {
      const jobQuotes = quotes.filter(q => q.jobId === job.id);
      const acceptedQuote = quotes.find(q => q.id === job.acceptedQuoteId);
      const jobReviewed = reviews.some(r => r.jobId === job.id);
      
      const isQuoted = job.status === 'quoted';
      const isAccepted = job.status === 'accepted';
      
      return (
        <div key={job.id} className="p-4 border rounded-lg shadow-sm bg-white">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-lg font-medium">{job.service}</h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
              job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              job.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
              job.status === 'accepted' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>{job.status}</span>
          </div>
          <p className="text-sm text-gray-600">{job.description}</p>
          <p className="text-xs text-gray-500 mt-2">For unit: {job.unit} | Posted on {new Date(job.date).toLocaleDateString()}</p>
          
          {isQuoted && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700">Quotes ({jobQuotes.length})</h4>
              <div className="space-y-2 mt-2">
                {jobQuotes.map(quote => (
                  <div key={quote.id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{getPartnerName(quote.providerUid)} - <span className="text-green-600 font-bold">${quote.quoteAmount}</span></p>
                      <p className="text-xs text-gray-500 mt-1">{quote.message}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleAcceptQuote(job.id, quote.id)} className="p-2 text-white bg-green-500 rounded-lg hover:bg-green-600">Accept</button>
                      <button onClick={() => handleRejectQuote(job.id, quote.id)} className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isAccepted && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700">Accepted Quote</h4>
              <div className="p-3 bg-green-100 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{getPartnerName(acceptedQuote?.providerUid)} - <span className="text-green-600 font-bold">${acceptedQuote?.quoteAmount}</span></p>
                  <p className="text-xs text-gray-500 mt-1">{acceptedQuote?.message}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleOpenChat(job.id)} className="py-2 px-4 text-white bg-purple-600 rounded-lg hover:bg-purple-700">Chat</button>
                  {!jobReviewed && (
                    <button onClick={() => setViewedProfile(acceptedQuote?.providerUid)} className="py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Review</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    };

    return (
      <>
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h1 className="text-3xl font-bold text-gray-800">Resident Dashboard</h1>
          <div className="flex space-x-2">
            <button onClick={() => setActiveResidentTab('home')} className={`py-2 px-4 font-medium rounded-lg ${activeResidentTab === 'home' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Home</button>
            <button onClick={() => setActiveResidentTab('my-jobs')} className={`py-2 px-4 font-medium rounded-lg ${activeResidentTab === 'my-jobs' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>My Jobs</button>
            <button onClick={() => { setIsViewingProfile(true); setViewedProfile(allUsers.find(u => u.id === user.uid)); }} className={`py-2 px-4 font-medium rounded-lg ${activeResidentTab === 'my-profile' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>My Profile</button>
          </div>
        </div>
        {activeResidentTab === 'home' ? (
          <>
            <div className="mb-8">
              <input
                type="text"
                placeholder="Search for services..."
                value={residentSearchQuery}
                onChange={(e) => setResidentSearchQuery(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {memoizedServiceCatalog.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleOpenRequest(service)}
                  className="bg-gray-50 hover:bg-purple-50 transition-colors duration-200 p-6 rounded-xl border border-gray-200 shadow-md flex flex-col items-center text-center group"
                >
                  <div className="p-4 bg-purple-100 group-hover:bg-purple-200 rounded-full mb-4 transition-colors duration-200">
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">{service.name}</h2>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">My Service Requests</h2>
            {myJobs.length === 0 ? (
              <p className="text-center text-gray-500">You have no active job requests.</p>
            ) : (
              myJobs.map(job => renderJobItem(job))
            )}
          </div>
        )}
      </>
    );
  };

  const renderServiceProviderDashboard = () => {
    const myQuotes = quotes.filter(q => q.providerUid === user.uid);
    const myAcceptedJobs = allJobs.filter(job => job.acceptedQuoteId && quotes.find(q => q.id === job.acceptedQuoteId)?.providerUid === user.uid);

    const totalEarnings = myAcceptedJobs.reduce((sum, job) => {
      const quote = quotes.find(q => q.id === job.acceptedQuoteId);
      return sum + (quote ? parseFloat(quote.quoteAmount) : 0);
    }, 0);
    
    const renderJobItem = (job) => {
      const myQuote = myQuotes.find(q => q.jobId === job.id);
      const isMyQuoteAccepted = job.acceptedQuoteId === myQuote?.id;
      
      return (
        <div key={job.id} className="p-4 border rounded-lg shadow-sm bg-white">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-lg font-medium">{job.service} - <span className="font-normal text-gray-600">Request from {job.residentName}</span></h3>
            <p className="text-sm text-gray-600">{job.description}</p>
            <p className="text-sm text-gray-500 mt-1">For unit: {job.unit}</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
              job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              job.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>{job.status}</span>
          </div>
          {isMyQuoteAccepted && (
            <div className="mt-4 flex justify-between items-center bg-green-100 p-3 rounded-lg">
              <p className="text-sm text-green-800 font-semibold">Accepted! Your quote was ${myQuote.quoteAmount}.</p>
              <button onClick={() => handleOpenChat(job.id)} className="py-1 px-3 text-white bg-purple-600 rounded-lg hover:bg-purple-700 text-sm">Chat</button>
            </div>
          )}
          {!isMyQuoteAccepted && myQuote && (
            <p className="text-sm text-gray-500 mt-2">You quoted ${myQuote.quoteAmount}. Status: {myQuote.status}</p>
          )}
        </div>
      )
    };

    return (
      <>
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h1 className="text-3xl font-bold text-gray-800">Service Provider Dashboard</h1>
          <div className="flex space-x-2">
            <button onClick={() => setActiveSPTab('available-jobs')} className={`py-2 px-4 font-medium rounded-lg ${activeSPTab === 'available-jobs' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Available Jobs</button>
            <button onClick={() => setActiveSPTab('my-jobs')} className={`py-2 px-4 font-medium rounded-lg ${activeSPTab === 'my-jobs' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>My Jobs</button>
            <button onClick={() => setActiveSPTab('community')} className={`py-2 px-4 font-medium rounded-lg ${activeSPTab === 'community' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Community</button>
            <button onClick={() => setActiveSPTab('training')} className={`py-2 px-4 font-medium rounded-lg ${activeSPTab === 'training' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Training</button>
            <button onClick={() => { setIsViewingProfile(true); setViewedProfile(allUsers.find(u => u.id === user.uid)); }} className={`py-2 px-4 font-medium rounded-lg ${activeSPTab === 'my-profile' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>My Profile</button>
          </div>
        </div>

        {activeSPTab === 'available-jobs' ? (
          isServiceProviderOnboarding ? (
            <div className="p-6 bg-gray-50 rounded-xl shadow-inner">
              <h2 className="text-2xl font-semibold mb-4 text-center">Register as a Service Provider</h2>
              <form onSubmit={handleOnboardSubmit} className="space-y-4">
                <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" id="name" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <div><label htmlFor="service" className="block text-sm font-medium text-gray-700">Service Offered</label><select id="service" required className="w-full p-2 mt-1 border rounded-lg">{serviceCatalog.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}</select></div>
                <div><label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label><input type="tel" id="phone" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Register</button>
              </form>
              <p className="text-sm text-gray-500 mt-4 text-center">Or <button onClick={() => setIsServiceProviderOnboarding(false)} className="text-purple-600 hover:underline">go back to jobs</button></p>
            </div>
          ) : (
            !isQuoting ? (
              <div className="space-y-4">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search available jobs..."
                    value={spSearchQuery}
                    onChange={(e) => setSpSearchQuery(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">Available Jobs</h2>
                  <button onClick={() => setIsServiceProviderOnboarding(true)} className="py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600">Register as SP</button>
                </div>
                {memoizedAvailableJobs.map((job) => (
                  <div key={job.id} className="p-4 border rounded-lg shadow-sm bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium">{job.service} - <span className="font-normal text-gray-600">Request from {job.residentName}</span></h3>
                      <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                    </div>
                    <button onClick={() => handleViewQuote(job)} className="py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      View & Quote
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative p-6 bg-gray-50 rounded-xl shadow-inner">
                <h2 className="text-2xl font-bold mb-4 text-center">Submit a Quote</h2>
                <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
                  <h3 className="text-lg font-semibold">{selectedJob.service}</h3>
                  <p className="text-gray-600 mt-1">{selectedJob.description}</p>
                  <p className="text-sm text-gray-500 mt-2">Requested by {selectedJob.residentName}</p>
                </div>
                <form onSubmit={handleQuoteSubmission} className="space-y-4">
                  <div><label htmlFor="quote" className="block text-sm font-medium text-gray-700">Your Quote (in $)</label><input type="number" id="quote" required className="w-full p-2 mt-1 border rounded-lg" placeholder="e.g., 50" /></div>
                  <div><label htmlFor="message" className="block text-sm font-medium text-gray-700">Message to Resident</label><textarea id="message" rows="3" className="w-full p-2 mt-1 border rounded-lg" placeholder="e.g., 'Hi, I'm available to do this job tomorrow morning. Let me know if that works for you.'"></textarea></div>
                  <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Submit Quote</button>
                </form>
              </div>
            )
          )
        ) : activeSPTab === 'community' ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Community Forum</h2>
            <div className="p-4 bg-gray-100 rounded-lg shadow-inner">
              <h3 className="font-semibold text-lg mb-2">Post to the Community</h3>
              <form onSubmit={handlePostCommunityPost} className="space-y-2">
                <input type="text" name="title" placeholder="Post Title" required className="w-full p-2 rounded-lg border" />
                <textarea name="content" rows="3" placeholder="Share tips, ask for advice..." required className="w-full p-2 rounded-lg border"></textarea>
                <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Post</button>
              </form>
            </div>
            <h3 className="text-xl font-semibold mt-6">Recent Posts</h3>
            {communityPosts.map(post => (
              <div key={post.id} className="p-4 bg-white rounded-lg shadow-sm">
                <h4 className="font-semibold">{post.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{post.content}</p>
                <p className="text-xs text-gray-500 mt-2">By {post.authorName} on {new Date(post.timestamp).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : activeSPTab === 'training' ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Skill Development & Training</h2>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg">Course: Advanced Plumbing Techniques</h3>
              <p className="text-sm text-gray-600">A comprehensive course on leak detection, pipe soldering, and advanced fixture installation. Includes video modules and quizzes.</p>
              <button className="mt-2 py-1 px-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Enroll Now</button>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg">Webinar: Getting More 5-Star Reviews</h3>
              <p className="text-sm text-gray-600">Learn best practices for customer communication and satisfaction to boost your ratings and grow your business.</p>
              <button className="mt-2 py-1 px-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Watch Now</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">My Jobs & Earnings</h2>
            <div className="p-4 bg-gray-200 rounded-lg shadow-inner flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Earnings:</span>
              <span className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</span>
            </div>
            <h3 className="text-xl font-semibold mt-6">All My Quotes</h3>
            <div className="space-y-2">
              {myQuotes.length === 0 ? (
                <p className="text-center text-gray-500">You haven't submitted any quotes yet.</p>
              ) : (
                myQuotes.map(quote => renderJobItem(allJobs.find(job => job.id === quote.jobId)))
              )}
            </div>
          </div>
        )}
      </>
    );
  };
    const renderAdminDashboard = () => (
      <>
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        
        <div className="flex flex-wrap gap-2 mb-6 border-b">
          <button onClick={() => setActiveAdminTab('providers')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'providers' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Providers</button>
          <button onClick={() => setActiveAdminTab('users')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'users' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Users</button>
          <button onClick={() => setActiveAdminTab('jobs')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'jobs' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Jobs</button>
          <button onClick={() => setActiveAdminTab('announcements')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'announcements' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Announcements</button>
          <button onClick={() => setActiveAdminTab('service-catalog')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'service-catalog' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Service Catalog</button>
          <button onClick={() => setActiveAdminTab('events')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'events' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Events</button>
          <button onClick={() => setActiveAdminTab('projects')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'projects' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Projects</button>
          <button onClick={() => setActiveAdminTab('categories')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'categories' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Categories</button>
          <button onClick={() => setActiveAdminTab('subscriptions')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'subscriptions' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Subscriptions</button>
          <button onClick={() => setActiveAdminTab('security')} className={`pb-2 px-4 text-lg font-medium ${activeAdminTab === 'security' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>Security</button>
        </div>
        
        {activeAdminTab === 'providers' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Pending Service Providers ({pendingProviders.length})</h2>
            <div className="space-y-4">
              {pendingProviders.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-500"><CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" /><p>No new service providers waiting for approval!</p></div>
              ) : (
                pendingProviders.map((provider) => (
                  <div key={provider.id} className="p-4 border rounded-lg shadow-sm bg-white flex items-center justify-between">
                    <div><h3 className="text-lg font-medium">{provider.name} <span className="font-normal text-gray-500">({provider.service})</span></h3><div className="flex items-center space-x-2 text-sm text-gray-600 mt-1"><Phone size={16} /><span>{provider.phone}</span></div></div>
                    <div className="flex space-x-2"><button onClick={() => handleApproveProvider(provider.id)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Approve</button><button onClick={() => handleRejectProvider(provider.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Reject</button></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activeAdminTab === 'users' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">All Users ({allUsers.length})</h2>
            <div className="space-y-4">
              {allUsers.map((u) => (
                <div key={u.id} className="p-4 border rounded-lg shadow-sm bg-white flex items-center justify-between">
                  <div className="flex items-center">
                    <User size={24} className="text-gray-500 mr-4 flex-shrink-0" />
                    <div><h3 className="text-lg font-medium">{u.name}</h3><p className="text-sm text-gray-600 capitalize">{u.role} {u.role === 'resident' && `(${u.apartment})`}</p></div>
                  </div>
                  <button onClick={() => { setIsViewingProfile(true); setViewedProfile(u); }} className="text-purple-600 hover:underline">View Profile</button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeAdminTab === 'jobs' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">All Job Requests ({allJobs.length})</h2>
            <div className="space-y-4">
              {allJobs.map((job) => (
                <div key={job.id} className="p-4 border rounded-lg shadow-sm bg-white">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-medium">{job.service}</h3>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                      job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      job.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
                      job.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{job.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{job.description}</p>
                  <p className="text-xs text-gray-500 mt-2">Requested by {job.residentName} on {new Date(job.date).toLocaleDateString()}</p>
                  <button onClick={() => handleOpenChat(job.id)} className="text-sm text-purple-600 hover:underline mt-2 flex items-center">
                    <MessageSquare size={16} className="mr-1" /> View/Start Chat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminTab === 'announcements' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Post Community Announcement</h2>
            <div className="p-6 bg-gray-50 rounded-xl shadow-inner mb-6">
              <form onSubmit={handlePostAnnouncement} className="space-y-4">
                <div><label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label><input type="text" id="title" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <div><label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label><textarea id="content" rows="4" required className="w-full p-2 mt-1 border rounded-lg"></textarea></div>
                <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center">
                  <Bell size={20} className="mr-2"/> Post Announcement
                </button>
              </form>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Recent Announcements</h2>
            <div className="space-y-4">
              {announcements.map(announcement => (
                <div key={announcement.id} className="p-4 border rounded-lg shadow-sm bg-white">
                  <h3 className="text-lg font-bold">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                  <p className="text-xs text-gray-500 mt-2">Posted by {announcement.adminName} on {new Date(announcement.timestamp).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeAdminTab === 'service-catalog' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Manage Service Catalog</h2>
            <div className="p-6 bg-gray-50 rounded-xl shadow-inner mb-6">
              <form onSubmit={handleAddService} className="space-y-4">
                <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Service Name</label><input type="text" id="name" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <div><label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label><input type="text" id="category" required className="w-full p-2 mt-1 border rounded-lg" placeholder="e.g., Household, Repairs" /></div>
                <div><label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label><textarea id="description" rows="2" required className="w-full p-2 mt-1 border rounded-lg"></textarea></div>
                <div><label htmlFor="icon" className="block text-sm font-medium text-gray-700">Icon (e.g., Wrench, Zap)</label><input type="text" id="icon" className="w-full p-2 mt-1 border rounded-lg" placeholder="Must be a valid Lucide-react icon name" /></div>
                <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center">
                  <Plus size={20} className="mr-2"/> Add Service
                </button>
              </form>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Current Services</h2>
            <div className="space-y-4">
              {serviceCatalog.map((service) => (
                <div key={service.id} className="p-4 border rounded-lg shadow-sm bg-white">
                  <div className="flex items-center">
                    <LayoutGrid size={24} className="text-gray-500 mr-4" />
                    <div>
                      <h3 className="text-lg font-medium">{service.name}</h3>
                      <p className="text-sm text-gray-600">Category: {service.category}</p>
                      <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeAdminTab === 'events' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Manage Community Events</h2>
            <div className="p-6 bg-gray-50 rounded-xl shadow-inner mb-6">
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div><label htmlFor="title" className="block text-sm font-medium text-gray-700">Event Title</label><input type="text" id="title" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <div><label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label><textarea id="description" rows="2" required className="w-full p-2 mt-1 border rounded-lg"></textarea></div>
                <div><label htmlFor="date" className="block text-sm font-medium text-gray-700">Date & Time</label><input type="datetime-local" id="date" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <div><label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label><input type="text" id="location" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center">
                  <Plus size={20} className="mr-2"/> Add Event
                </button>
              </form>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="p-4 border rounded-lg shadow-sm bg-white">
                  <div className="flex items-center">
                    <Mic size={24} className="text-purple-500 mr-4" />
                    <div>
                      <h3 className="text-lg font-medium">{event.title}</h3>
                      <p className="text-sm text-gray-600">{new Date(event.date).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Location: {event.location}</p>
                      <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminTab === 'feedback' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">User Feedback & Requests ({feedback.length})</h2>
            <div className="p-6 bg-gray-50 rounded-xl shadow-inner mb-6">
              <form onSubmit={handleAddFeedback} className="space-y-4">
                <div><label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label><input type="text" id="title" required className="w-full p-2 mt-1 border rounded-lg" /></div>
                <div><label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label><textarea id="content" rows="4" required className="w-full p-2 mt-1 border rounded-lg"></textarea></div>
                <button type="submit" className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center">
                  <Plus size={20} className="mr-2"/> Submit Feedback
                </button>
              </form>
            </div>
            <div className="space-y-4">
              {feedback.map((f) => (
                <div key={f.id} className="p-4 border rounded-lg shadow-sm bg-white">
                  <div className="flex items-center">
                    <MessageSquare size={24} className="text-gray-500 mr-4" />
                    <div>
                      <h3 className="text-lg font-medium">{f.title}</h3>
                      <p className="text-sm text-gray-600">{f.content}</p>
                      <p className="text-xs text-gray-500 mt-1">Submitted by {f.author} on {new Date(f.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeAdminTab === 'security' && (
          <div className="p-6 bg-gray-50 rounded-xl shadow-inner space-y-6">
            <h2 className="text-2xl font-semibold">Security & Safety Measures</h2>
            <p className="text-gray-600">This section outlines the critical security and safety measures required for a production-level application. While these are not fully implemented in this front-end demo, they are essential for a real-world platform.</p>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-2">1. Identity Verification for Service Providers</h3>
              <p className="text-gray-700">Implement a process for providers to upload government-issued IDs. This would be paired with a third-party background check service to build a "Verified" badge on their profile. This greatly increases trust and safety for residents.</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-2">2. Anomalous Behavior Detection</h3>
              <p className="text-gray-700">Utilize AI to monitor for unusual activity, such as a provider suddenly accepting many jobs in a new, distant area. Such behavior can be automatically flagged for administrative review.</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-2">3. Secure Payment & Fraud Tools</h3>
              <p className="text-gray-700">A production app should use a **PCI DSS compliant payment gateway** (e.g., Stripe, PayPal) with built-in fraud detection services to protect all financial transactions in real-time.</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-2">4. Transparent Review System</h3>
              <p className="text-gray-700">A robust, two-way review system where both residents and providers can leave feedback is key. Implement tools for flagging and removing fake or malicious reviews to maintain the system's integrity.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-2">5. Dispute Resolution & Legal Compliance</h3>
              <p className="text-gray-700">An easy-to-access dispute center and a clear, legally sound set of terms of service and privacy policies are essential for handling conflicts and mitigating legal risks.</p>
            </div>
          </div>
        )}
      </>
    );

  const renderContent = () => {
    // Check if auth state has been determined yet. If not, show a loading screen.
    if (!isAuthReady) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans text-xl text-gray-700">
          Loading...
        </div>
      );
    }
    
    // Logic for new and existing users
    if (!user.isLoggedIn) {
      if (isNewUser && !user.role && !otpSent) {
        return (
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Select Your Role</h1>
            <p className="text-gray-500 mb-8">Please choose your role to continue.</p>
            <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
              <button onClick={() => handleNewUserRoleSelection('resident')} className="py-3 px-6 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors">I am a Resident</button>
              <button onClick={() => handleNewUserRoleSelection('serviceProvider')} className="py-3 px-6 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">I am a Service Provider</button>
            </div>
          </div>
        );
      } else if (user.role && !otpSent) {
        return (
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Log in as {user.role}</h1>
            <p className="text-gray-500 mb-8">Please enter your phone number to receive an OTP.</p>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative"><MessageCircleMore className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Enter Phone Number" className="pl-10 p-3 w-64 border rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
              <button onClick={() => handleSendOtp(user.role)} className="py-3 px-6 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors">Send OTP via WhatsApp</button>
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-purple-600">Change Role</button>
            </div>
          </div>
        );
      } else if (user.role && otpSent) {
        return (
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Verify OTP</h1>
            <p className="text-gray-500 mb-8">An OTP has been sent to {phoneNumber}.</p>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" className="pl-10 p-3 w-64 border rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
              <button onClick={handleVerifyOtp} disabled={isVerifyingOtp} className={`py-3 px-6 bg-purple-600 text-white font-semibold rounded-lg shadow-md transition-colors ${isVerifyingOtp ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}>{isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}</button>
              <button onClick={() => setOtpSent(false)} className="text-sm text-gray-500 hover:text-purple-600">Resend OTP</button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to HumanAI Concierge 👋</h1>
            <p className="text-gray-500 mb-8">Sign in with your preferred method.</p>
            <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
              <button onClick={handleGoogleSignIn} disabled={isSigningInWithGoogle} className={`py-3 px-6 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center ${isSigningInWithGoogle ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" className="mr-2">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.619 6.283-7.237 10.748-13.303 10.748c-8.844 0-16-7.156-16-16s7.156-16 16-16c3.159 0 6.026 1.192 8.243 3.007l5.968-5.968C34.357 5.163 29.803 3 24 3C12.955 3 3 12.955 3 24s9.955 21 21 21c11.045 0 20.021-8.597 20.916-19.141z" />
                  <path fill="#FF3D00" d="M6.306 14.691L1.4 9.873C4.306 4.673 11.233 1 24 1h0c11.045 0 20.021 8.597 20.916 19.141z" />
                  <path fill="#4CAF50" d="M24 45c-9.063 0-16.732-5.748-19.511-13.784L1.39 36.311C4.306 41.311 11.233 45 24 45h0c11.045 0 20.021-8.597 20.916-19.141z" />
                  <path fill="#1976D2" d="M45.021 24c0-1.898-.213-3.71-.595-5.419H42V24H24v8h11.303c-1.619 6.283-7.237 10.748-13.303 10.748c-8.844 0-16-7.156-16-16s7.156-16 16-16c3.159 0 6.026 1.192 8.243 3.007l5.968-5.968C34.357 5.163 29.803 3 24 3c11.045 0 20.021 8.597 20.916 19.141z" />
                </svg>
                {isSigningInWithGoogle ? 'Signing In...' : 'Sign in with Google'}
              </button>
              <button onClick={() => setIsNewUser(true)} className="py-3 px-6 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors flex items-center justify-center">
                <Phone size={20} className="mr-2" />
                Sign in with Phone
              </button>
            </div>
          </div>
        );
      }
    } else {
      return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      {renderContent()}
      <Modal title={modalContent?.title} message={modalContent?.message} onClose={closeModal} />
    </div>
  );
};

export default App;
