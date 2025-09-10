import React, { useState } from 'react';
import { useLeads } from './hooks/useLeads';
import { LeadsTable } from './components/LeadsTable';
import { AddLeadForm } from './components/AddLeadForm';
import { Database, Phone } from 'lucide-react';

function App() {
  const { leads, loading, error, createLead, initiateCall, initiateCallElevenLabs, initiateCallOpenAI, initiateTestCall } = useLeads();
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [callingType, setCallingType] = useState<'basic' | 'elevenlabs' | 'openai' | 'test' | null>(null);

  const handleInitiateTestCall = async (leadId: string) => {
    try {
      setCallingLeadId(leadId);
      setCallingType('test');
      const result = await initiateTestCall(leadId);
      
      if (result.success) {
        alert(`Test call started for ${result.leadName}! Call SID: ${result.callSid}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate test call';
      if (errorMessage.includes('geo-permissions') || errorMessage.includes('International calling')) {
        alert(`${errorMessage}\n\nTo fix this:\n1. Go to your Twilio Console\n2. Navigate to Voice → Manage → Geo permissions\n3. Enable calling to the required countries`);
      } else {
        alert(`Failed to initiate test call: ${errorMessage}`);
      }
    } finally {
      setCallingLeadId(null);
      setCallingType(null);
    }
  };

  const handleInitiateCall = async (leadId: string) => {
    try {
      setCallingLeadId(leadId);
      setCallingType('basic');
      const result = await initiateCall(leadId);
      
      if (result.success) {
        alert(`Basic call started for ${result.leadName}! Call SID: ${result.callSid}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
      if (errorMessage.includes('geo-permissions') || errorMessage.includes('International calling')) {
        alert(`${errorMessage}\n\nTo fix this:\n1. Go to your Twilio Console\n2. Navigate to Voice → Manage → Geo permissions\n3. Enable calling to the required countries`);
      } else {
        alert(`Failed to initiate call: ${errorMessage}`);
      }
    } finally {
      setCallingLeadId(null);
      setCallingType(null);
    }
  };

  const handleInitiateCallElevenLabs = async (leadId: string) => {
    try {
      setCallingLeadId(leadId);
      setCallingType('elevenlabs');
      const result = await initiateCallElevenLabs(leadId);
      
      if (result.success) {
        alert(`ElevenLabs AI call started for ${result.leadName}! Call SID: ${result.callSid}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate ElevenLabs call';
      if (errorMessage.includes('geo-permissions') || errorMessage.includes('International calling')) {
        alert(`${errorMessage}\n\nTo fix this:\n1. Go to your Twilio Console\n2. Navigate to Voice → Manage → Geo permissions\n3. Enable calling to the required countries`);
      } else {
        alert(`Failed to initiate ElevenLabs call: ${errorMessage}`);
      }
    } finally {
      setCallingLeadId(null);
      setCallingType(null);
    }
  };

  const handleInitiateCallOpenAI = async (leadId: string) => {
    try {
      setCallingLeadId(leadId);
      setCallingType('openai');
      const result = await initiateCallOpenAI(leadId);
      
      if (result.success) {
        alert(`OpenAI TTS call started for ${result.leadName}! Call SID: ${result.callSid}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate OpenAI call';
      if (errorMessage.includes('geo-permissions') || errorMessage.includes('International calling')) {
        alert(`${errorMessage}\n\nTo fix this:\n1. Go to your Twilio Console\n2. Navigate to Voice → Manage → Geo permissions\n3. Enable calling to the required countries`);
      } else {
        alert(`Failed to initiate OpenAI call: ${errorMessage}`);
      }
    } finally {
      setCallingLeadId(null);
      setCallingType(null);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Phone className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Autocaller MVP</h1>
          </div>
          <p className="text-gray-600">Manage your leads and track conversion progress</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                    <dd className="text-lg font-medium text-gray-900">{leads.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Converted</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {leads.filter(lead => lead.status === 'converted').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">New Leads</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {leads.filter(lead => lead.status === 'new').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Lead Form */}
        <div className="mb-6">
          <AddLeadForm onAddLead={createLead} loading={loading} />
        </div>

        {/* Leads Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Leads</h2>
            <p className="mt-1 text-sm text-gray-500">
              A list of all leads in your account including their name, phone, email, and status.
            </p>
          </div>
          <div className="px-6 py-4">
            <LeadsTable 
              leads={leads} 
              loading={loading} 
              error={error} 
              onInitiateCall={handleInitiateCall}
              onInitiateCallElevenLabs={handleInitiateCallElevenLabs}
              onInitiateCallOpenAI={handleInitiateCallOpenAI}
              onInitiateTestCall={handleInitiateTestCall}
              callingLeadId={callingLeadId}
              callingType={callingType}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;