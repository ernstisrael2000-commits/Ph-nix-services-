import { 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { signInWithGooglePopup, mapGoogleAuthError } from '../lib/google-auth';
import { getAffiliateByEmail } from './affiliateService';
import { getAgentByEmail } from './agentService';
import { Affiliate, Agent } from '../types';

export interface SocialLoginResult {
  user: User;
  affiliate?: Affiliate;
  agent?: Agent;
  error?: string;
  type: 'affiliate' | 'agent' | 'none';
  noAccount?: boolean;
  googleUid?: string;
  googleEmail?: string;
  googleName?: string;
  googlePhotoUrl?: string;
}

export const loginWithGoogle = async (targetType: 'affiliate' | 'agent'): Promise<SocialLoginResult> => {
  try {
    const result = await signInWithGooglePopup();
    const user = result.user;
    const email = user.email;

    if (!email) {
      throw new Error("L'email Google est requis.");
    }

    if (targetType === 'affiliate') {
      const affiliate = await getAffiliateByEmail(email);
      if (!affiliate) {
        return {
          user, type: 'none', noAccount: true,
          googleUid: user.uid,
          googleEmail: email,
          googleName: user.displayName || '',
          googlePhotoUrl: user.photoURL || '',
        };
      }

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

      const updates: any = {
        uid: user.uid,
        email: email,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'agents', agent.id!), updates);
      
      return { user, agent: { ...agent, ...updates }, type: 'agent' };
    }
  } catch (error: any) {
    const mapped = mapGoogleAuthError(error);
    if (!mapped) return { user: {} as User, type: 'none', error: '' };
    console.error("Google Login Error:", error);
    return { 
      user: {} as User, 
      type: 'none', 
      error: mapped
    };
  }
};
