import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getAffiliateByEmail } from './affiliateService';
import { getAgentByEmail } from './agentService';
import { Affiliate, Agent } from '../types';

export const googleProvider = new GoogleAuthProvider();

export interface SocialLoginResult {
  user: User;
  affiliate?: Affiliate;
  agent?: Agent;
  error?: string;
  type: 'affiliate' | 'agent' | 'none';
}

export const loginWithGoogle = async (targetType: 'affiliate' | 'agent'): Promise<SocialLoginResult> => {
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

      // Link UID if not already linked or update email if it was only in info
      const updates: any = {
        uid: user.uid,
        email: email,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'affiliates', affiliate.id!), updates);
      
      return { user, affiliate: { ...affiliate, ...updates }, type: 'affiliate' };
    } else {
      const agent = await getAgentByEmail(email);
      if (!agent) {
        return { user, type: 'none', error: "Aucun compte agent trouvé avec cet email." };
      }

      // Link UID
      const updates: any = {
        uid: user.uid,
        email: email,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'agents', agent.id!), updates);
      
      return { user, agent: { ...agent, ...updates }, type: 'agent' };
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
