import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getAffiliateByEmail } from './affiliateService';
import { getAgentByEmail } from './agentService';
import { getClientByEmail, registerClient } from './clientService';
import { Affiliate, Agent, Client } from '../types';

export const googleProvider = new GoogleAuthProvider();

export interface SocialLoginResult {
  user: User;
  affiliate?: Affiliate;
  agent?: Agent;
  client?: Client;
  error?: string;
  type: 'affiliate' | 'agent' | 'client' | 'none';
}

export const registerWithEmail = async (
  email: string, 
  pass: string, 
  targetType: 'client' | 'affiliate' | 'agent',
  additionalData: any
): Promise<SocialLoginResult> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    if (targetType === 'client') {
      const clientId = await registerClient({
        ...additionalData,
        uid: user.uid,
        email: email,
        status: 'pending'
      });
      const client = { id: clientId, uid: user.uid, email, ...additionalData, status: 'pending' } as Client;
      return { user, client, type: 'client' };
    } else if (targetType === 'agent') {
      const agentRef = await addDoc(collection(db, 'agents'), {
        ...additionalData,
        uid: user.uid,
        email: email,
        agentCode: Math.random().toString().slice(2, 10), // Random code if not provided
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const agent = { id: agentRef.id, uid: user.uid, email, ...additionalData } as Agent;
      return { user, agent, type: 'agent' };
    } else if (targetType === 'affiliate') {
       const affiliateRef = await addDoc(collection(db, 'affiliates'), {
        ...additionalData,
        uid: user.uid,
        email: email,
        balance: 0,
        earningsTotal: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const affiliate = { id: affiliateRef.id, uid: user.uid, email, ...additionalData } as Affiliate;
      return { user, affiliate, type: 'affiliate' };
    }
    
    return { user, type: 'none', error: "Type d'utilisateur inconnu." };
  } catch (error: any) {
    console.error("Email Registration Error:", error);
    let errorMessage = "Erreur lors de l'inscription.";
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = "Cet email est déjà utilisé.";
    }
    return { user: {} as User, type: 'none', error: errorMessage };
  }
};

export const loginWithEmail = async (
  email: string, 
  pass: string, 
  targetType: 'affiliate' | 'agent' | 'client'
): Promise<SocialLoginResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    if (targetType === 'affiliate') {
      const affiliate = await getAffiliateByEmail(email);
      if (!affiliate) {
        return { user, type: 'none', error: "Aucun compte affilié trouvé." };
      }
      if (affiliate.uid !== user.uid) {
        await updateDoc(doc(db, 'affiliates', affiliate.id!), { uid: user.uid });
      }
      return { user, affiliate, type: 'affiliate' };
    } else if (targetType === 'agent') {
      const agent = await getAgentByEmail(email);
      if (!agent) {
        return { user, type: 'none', error: "Aucun compte agent trouvé." };
      }
      if (agent.uid !== user.uid) {
        await updateDoc(doc(db, 'agents', agent.id!), { uid: user.uid });
      }
      return { user, agent, type: 'agent' };
    } else {
      const client = await getClientByEmail(email);
      if (!client) {
        return { user, type: 'none', error: "Aucun compte client trouvé." };
      }
      if (client.uid !== user.uid) {
        await updateDoc(doc(db, 'clients', client.id!), { uid: user.uid });
      }
      return { user, client, type: 'client' };
    }
  } catch (error: any) {
    console.error("Email Login Error:", error);
    let errorMessage = "Email ou mot de passe incorrect.";
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = "Email ou mot de passe incorrect.";
    }
    return { user: {} as User, type: 'none', error: errorMessage };
  }
};

export const loginWithGoogle = async (targetType: 'affiliate' | 'agent' | 'client'): Promise<SocialLoginResult> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const email = user.email;

    if (!email) {
      throw new Error("L'email Google est requis.");
    }

    if (targetType === 'affiliate') {
      const affiliate = await getAffiliateByEmail(email);
      if (!affiliate) {
        return { user, type: 'none', error: "Aucun compte affilié trouvé avec cet email." };
      }

      const updates: any = {
        uid: user.uid,
        email: email,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'affiliates', affiliate.id!), updates);
      return { user, affiliate: { ...affiliate, ...updates }, type: 'affiliate' };
    } else if (targetType === 'agent') {
      const agent = await getAgentByEmail(email);
      if (!agent) {
        return { user, type: 'none', error: "Aucun compte agent trouvé avec cet email." };
      }

      const updates: any = {
        uid: user.uid,
        email: email,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'agents', agent.id!), updates);
      return { user, agent: { ...agent, ...updates }, type: 'agent' };
    } else {
      // Client Google Login
      let client = await getClientByEmail(email);
      
      if (!client) {
        // Auto-register client if not found (or user can sign up first)
        const clientId = await registerClient({
          uid: user.uid,
          email: email,
          name: user.displayName || email.split('@')[0],
          phone: '',
          photoURL: user.photoURL || '',
          balance: 0,
          status: 'approved' // Social login auto-approved for clients
        });
        client = { 
          id: clientId, 
          uid: user.uid, 
          email, 
          name: user.displayName || email.split('@')[0],
          phone: '',
          balance: 0,
          status: 'approved'
        } as Client;
      } else {
        const updates: any = {
          uid: user.uid,
          photoURL: user.photoURL || client.photoURL,
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'clients', client.id!), updates);
        client = { ...client, ...updates };
      }
      
      return { user, client, type: 'client' };
    }
  } catch (error: any) {
    console.error("Google Login Error:", error);
    return { 
      user: {} as User, 
      type: 'none', 
      error: error.message || "Une erreur est survenue lors de la connexion Google." 
    };
  }
};
