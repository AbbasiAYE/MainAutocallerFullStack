import { useState, useEffect } from 'react';
import { Lead, CreateLeadRequest } from '../types/Lead';
import { supabase } from '../lib/supabase';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = `/api/leads`;
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData: CreateLeadRequest): Promise<Lead> => {
    try {
      setError(null);
      const apiUrl = `/api/leads`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to create lead`);
      }

      const newLead = await response.json();
      setLeads(prev => [newLead, ...prev]);
      return newLead;
    } catch (err) {
      console.error('Create lead error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const initiateCallElevenLabs = async (leadId: string): Promise<{ success: boolean; message: string; leadName?: string; leadPhone?: string; callSid?: string; ttsProvider?: string }> => {
    try {
      const apiUrl = `/api/call-elevenlabs/${leadId}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to initiate ElevenLabs call`);
      }

      const result = await response.json();
      
      // Update the lead status in local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: 'contacted' as Lead['status'] } : lead
      ));
      
      return result;
    } catch (err) {
      console.error('Initiate ElevenLabs call error:', err);
      throw err;
    }
  };

  const initiateCallOpenAI = async (leadId: string): Promise<{ success: boolean; message: string; leadName?: string; leadPhone?: string; callSid?: string; ttsProvider?: string }> => {
    try {
      const apiUrl = `/api/call-openai/${leadId}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to initiate OpenAI call`);
      }

      const result = await response.json();
      
      // Update the lead status in local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: 'contacted' as Lead['status'] } : lead
      ));
      
      return result;
    } catch (err) {
      console.error('Initiate OpenAI call error:', err);
      throw err;
    }
  };

  const initiateTestCall = async (leadId: string): Promise<{ success: boolean; message: string; leadName?: string; leadPhone?: string; callSid?: string; callType?: string }> => {
    try {
      const apiUrl = `/api/call-test/${leadId}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to initiate test call`);
      }

      const result = await response.json();
      
      return result;
    } catch (err) {
      console.error('Initiate test call error:', err);
      throw err;
    }
  };

  const initiateCall = async (leadId: string): Promise<{ success: boolean; message: string; leadName?: string; leadPhone?: string }> => {
    try {
      const apiUrl = `/api/call/${leadId}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to initiate call`);
      }

      const result = await response.json();
      
      // Update the lead status in local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: 'contacted' as Lead['status'] } : lead
      ));
      
      return result;
    } catch (err) {
      console.error('Initiate call error:', err);
      throw err;
    }
  };
  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    loading,
    error,
    fetchLeads,
    createLead,
    initiateCall,
    initiateCallElevenLabs,
    initiateCallOpenAI,
    initiateTestCall,
  };
}