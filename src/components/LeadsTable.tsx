import React from 'react';
import { Lead } from '../types/Lead';
import { formatDate } from '../utils/dateUtils';
import { StatusBadge } from './StatusBadge';
import { Loader2, Phone, Mic, Volume2 } from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  onInitiateCall: (leadId: string) => Promise<void>;
  onInitiateCallElevenLabs: (leadId: string) => Promise<void>;
  onInitiateCallOpenAI: (leadId: string) => Promise<void>;
  onInitiateTestCall: (leadId: string) => Promise<void>;
  callingLeadId: string | null;
  callingType: 'basic' | 'elevenlabs' | 'openai' | 'test' | null;
}

export function LeadsTable({ 
  leads, 
  loading, 
  error, 
  onInitiateCall, 
  onInitiateCallElevenLabs,
  onInitiateCallOpenAI,
  onInitiateTestCall,
  callingLeadId,
  callingType
}: LeadsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading leads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading leads: {error}</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No leads found. Add your first lead to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created At
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead, index) => (
            <tr 
              key={lead.id} 
              className={`hover:bg-gray-50 transition-colors duration-150 ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{lead.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{lead.phone}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{lead.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(lead.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => onInitiateTestCall(lead.id)}
                    disabled={callingLeadId === lead.id}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {callingLeadId === lead.id && callingType === 'test' ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Phone className="h-3 w-3 mr-1" />
                        Test Call
                      </>
                    )}
                  </button>
                  
                <button
                  onClick={() => onInitiateCall(lead.id)}
                  disabled={callingLeadId === lead.id}
                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {callingLeadId === lead.id && callingType === 'basic' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Calling...
                    </>
                  ) : (
                    <>
                      <Phone className="h-3 w-3 mr-1" />
                      Basic Call
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => onInitiateCallOpenAI(lead.id)}
                  disabled={callingLeadId === lead.id}
                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {callingLeadId === lead.id && callingType === 'openai' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Calling...
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3 mr-1" />
                      OpenAI TTS
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => onInitiateCallElevenLabs(lead.id)}
                  disabled={callingLeadId === lead.id}
                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {callingLeadId === lead.id && callingType === 'elevenlabs' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Calling...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3 mr-1" />
                      ElevenLabs
                    </>
                  )}
                </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}