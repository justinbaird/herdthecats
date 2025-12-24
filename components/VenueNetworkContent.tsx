'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { VenueNetwork, VenueInvitation, VenueContact } from '@/lib/supabase/types'
import { INSTRUMENTS, type Instrument } from '@/lib/supabase/types'
import MessageMusicianModal from './MessageMusicianModal'
import { COUNTRY_CODES } from '@/lib/country-codes'

interface VenueNetworkContentProps {
  venueId: string
  user: User
}

export default function VenueNetworkContent({ venueId, user }: VenueNetworkContentProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [networkMembers, setNetworkMembers] = useState<VenueNetwork[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [createdInvitation, setCreatedInvitation] = useState<VenueInvitation | null>(null)
  const [messageMember, setMessageMember] = useState<VenueNetwork | null>(null)
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [modalSearchResults, setModalSearchResults] = useState<any[]>([])
  const [modalSearching, setModalSearching] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [contacts, setContacts] = useState<VenueContact[]>([])
  const [showContactsTab, setShowContactsTab] = useState(false)
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [contactFormData, setContactFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '',
    instruments: [] as Instrument[],
    notes: '',
  })
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instruments: [] as Instrument[],
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadNetwork()
    loadContacts()
  }, [venueId])

  const loadNetwork = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/venues/${venueId}/network`)
      
      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error loading network:', response.status, errorText)
        if (isJson) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to load network: ${response.status}`)
          } catch {
            throw new Error(`Failed to load network: ${response.status}`)
          }
        } else {
          throw new Error(`Failed to load network: ${response.status}. Server returned: ${errorText.substring(0, 100)}`)
        }
      }

      if (!isJson) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
      }

      const { network, error: networkError } = await response.json()

      if (networkError) throw new Error(networkError)

      setNetworkMembers(network || [])
    } catch (error: any) {
      console.error('Error loading venue network:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await fetch(`/api/venues/${venueId}/contacts`)
      
      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error loading contacts:', response.status, errorText)
        if (isJson) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to load contacts: ${response.status}`)
          } catch {
            throw new Error(`Failed to load contacts: ${response.status}`)
          }
        } else {
          throw new Error(`Failed to load contacts: ${response.status}. Server returned: ${errorText.substring(0, 100)}`)
        }
      }

      if (!isJson) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
      }

      const data = await response.json()
      const { contacts, error: contactsError } = data

      if (contactsError) throw new Error(contactsError)

      setContacts(contacts || [])
    } catch (error: any) {
      console.error('Error loading contacts:', error)
      setError(error.message || 'Failed to load contacts')
    }
  }

  const searchMusicians = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError(null)

    try {
      const { data: musicians, error: searchError } = await supabase
        .from('musicians')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10)

      if (searchError) throw searchError

      // Filter out musicians already in network
      const networkMusicianIds = networkMembers.map((m) => m.musician_id)
      const filtered = musicians?.filter(
        (m) => !networkMusicianIds.includes(m.user_id)
      ) || []

      setSearchResults(filtered)
    } catch (error: any) {
      console.error('Error searching musicians:', error)
      setError(error.message)
    } finally {
      setSearching(false)
    }
  }

  const searchMusiciansInModal = async () => {
    if (!modalSearchQuery.trim()) return

    setModalSearching(true)
    setError(null)

    try {
      const { data: musicians, error: searchError } = await supabase
        .from('musicians')
        .select('*')
        .or(`name.ilike.%${modalSearchQuery}%,email.ilike.%${modalSearchQuery}%`)
        .limit(10)

      if (searchError) throw searchError

      // Filter out musicians already in network
      const networkMusicianIds = networkMembers.map((m) => m.musician_id)
      const filtered = musicians?.filter(
        (m) => !networkMusicianIds.includes(m.user_id)
      ) || []

      setModalSearchResults(filtered)
    } catch (error: any) {
      console.error('Error searching musicians:', error)
      setError(error.message)
    } finally {
      setModalSearching(false)
    }
  }

  const handleInstrumentToggle = (instrument: Instrument | 'Voice') => {
    if (instrument === 'Voice') {
      // Toggle Voice - remove all other instruments when Voice is selected
      if (formData.instruments.includes('Vocals' as Instrument)) {
        setFormData({ ...formData, instruments: [] })
      } else {
        setFormData({ ...formData, instruments: ['Vocals' as Instrument] })
      }
    } else {
      // Toggle regular instrument - remove Vocals if selecting other instruments
      const currentInstruments = formData.instruments.filter(i => i !== 'Vocals') as Instrument[]
      if (currentInstruments.includes(instrument)) {
        setFormData({ ...formData, instruments: currentInstruments.filter(i => i !== instrument) })
      } else {
        setFormData({ ...formData, instruments: [...currentInstruments, instrument] })
      }
    }
  }

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    setAdding(true)
    setError(null)
    setCreatedInvitation(null)

    try {
      const response = await fetch(`/api/venues/${venueId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          musician_email: formData.email || null,
          musician_first_name: formData.firstName || null,
          musician_last_name: formData.lastName || null,
          musician_phone: formData.phone || null,
          musician_instruments: formData.instruments.length > 0 ? formData.instruments : null,
          expires_in_days: 30,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      if (!response.ok) {
        const errorText = await response.text()
        if (isJson) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to create invitation: ${response.status}`)
          } catch {
            throw new Error(`Failed to create invitation: ${response.status}`)
          }
        } else {
          throw new Error(`Failed to create invitation: ${response.status}. Server returned: ${errorText.substring(0, 100)}`)
        }
      }

      if (!isJson) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
      }

      const { invitation, error: inviteError } = await response.json()

      if (inviteError) throw new Error(inviteError)

      setCreatedInvitation(invitation)
      setSuccess('Invitation created successfully!')
      
      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          instruments: [],
        })
      }, 2000)
    } catch (error: any) {
      console.error('Error creating invitation:', error)
      setError(error.message)
    } finally {
      setAdding(false)
    }
  }

  const getInvitationUrl = () => {
    if (createdInvitation) {
      // Use environment variable if available (for production), otherwise use current origin
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : '')
      return `${baseUrl}/invite/${createdInvitation.invitation_code}`
    }
    return ''
  }

  const copyInvitationCode = () => {
    if (createdInvitation) {
      const invitationUrl = getInvitationUrl()
      navigator.clipboard.writeText(invitationUrl)
      setSuccess('Invitation URL copied to clipboard!')
      setTimeout(() => setSuccess(null), 2000)
    }
  }

  const getWhatsAppShareUrl = () => {
    if (createdInvitation) {
      const invitationUrl = getInvitationUrl()
      const message = `Join my venue network on Herd the Cats! Use this invitation link: ${invitationUrl}`
      const encodedMessage = encodeURIComponent(message)
      return `https://wa.me/?text=${encodedMessage}`
    }
    return ''
  }

  const openWhatsAppShare = () => {
    const whatsappUrl = getWhatsAppShareUrl()
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const addToNetwork = async (musicianUserId: string) => {
    try {
      const response = await fetch(`/api/venues/${venueId}/network`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ musicianId: musicianUserId }),
      })

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      if (!response.ok) {
        const errorText = await response.text()
        if (isJson) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to add to network: ${response.status}`)
          } catch {
            throw new Error(`Failed to add to network: ${response.status}`)
          }
        } else {
          throw new Error(`Failed to add to network: ${response.status}. Server returned: ${errorText.substring(0, 100)}`)
        }
      }

      if (!isJson) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
      }

      const { networkMember, error: addError } = await response.json()

      if (addError) throw new Error(addError)

      setSuccess('Musician added to venue network!')
      setSearchQuery('')
      setSearchResults([])
      await loadNetwork()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error adding to network:', error)
      setError(error.message)
    }
  }

  const removeFromNetwork = async (musicianId: string) => {
    if (!confirm('Are you sure you want to remove this musician from the venue network?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/venues/${venueId}/network?musicianId=${musicianId}`,
        {
          method: 'DELETE',
        }
      )

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      if (!response.ok) {
        const errorText = await response.text()
        if (isJson) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to remove from network: ${response.status}`)
          } catch {
            throw new Error(`Failed to remove from network: ${response.status}`)
          }
        } else {
          throw new Error(`Failed to remove from network: ${response.status}. Server returned: ${errorText.substring(0, 100)}`)
        }
      }

      if (!isJson) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
      }

      const { error: deleteError } = await response.json()

      if (deleteError) throw new Error(deleteError)

      setSuccess('Musician removed from venue network!')
      await loadNetwork()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error removing from network:', error)
      setError(error.message)
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactFormData.phone) {
      setError('WhatsApp number is required')
      return
    }

    setAddingContact(true)
    setError(null)

    try {
      const response = await fetch(`/api/venues/${venueId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: contactFormData.firstName || null,
          last_name: contactFormData.lastName || null,
          email: contactFormData.email || null,
          phone: contactFormData.phone || null,
          country_code: contactFormData.countryCode || null,
          instruments: contactFormData.instruments,
          notes: contactFormData.notes || null,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      if (!response.ok) {
        const errorText = await response.text()
        if (isJson) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to add contact: ${response.status}`)
          } catch {
            throw new Error(`Failed to add contact: ${response.status}`)
          }
        } else {
          throw new Error(`Failed to add contact: ${response.status}. Server returned: ${errorText.substring(0, 100)}`)
        }
      }

      if (!isJson) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
      }

      const { contact, error: contactError } = await response.json()
      if (contactError) throw new Error(contactError)

      setSuccess('Contact added successfully!')
      setContactFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        countryCode: '',
        instruments: [],
        notes: '',
      })
      setShowAddContactModal(false)
      loadContacts()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error adding contact:', error)
      setError(error.message)
    } finally {
      setAddingContact(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const response = await fetch(`/api/venues/${venueId}/contacts?contactId=${contactId}`, {
        method: 'DELETE',
      })

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      
      if (!response.ok) {
        const errorText = await response.text()
        if (isJson) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || `Failed to delete contact: ${response.status}`)
          } catch {
            throw new Error(`Failed to delete contact: ${response.status}`)
          }
        } else {
          throw new Error(`Failed to delete contact: ${response.status}. Server returned: ${errorText.substring(0, 100)}`)
        }
      }

      if (!isJson) {
        const text = await response.text()
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
      }

      const { error: deleteError } = await response.json()
      if (deleteError) throw new Error(deleteError)

      setSuccess('Contact deleted successfully!')
      loadContacts()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error deleting contact:', error)
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-gray-900">Loading venue network...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Venue Network</h3>
          <p className="mt-1 text-sm text-gray-900">
            Build a network of musicians for this venue. These musicians can be invited to specific gigs.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
          title="Add musician to network"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setShowContactsTab(false)}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              !showContactsTab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Network Members ({networkMembers.length})
          </button>
          <button
            onClick={() => setShowContactsTab(true)}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              showContactsTab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Contacts ({contacts.length})
          </button>
        </nav>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Contacts Tab */}
      {showContactsTab ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-900">
              Add contacts with their details. You can send them gig invitations even if they haven't signed up yet.
            </p>
            <button
              onClick={() => setShowAddContactModal(true)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-gray-900">No contacts added yet. Click "+ Add Contact" to add one.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {contact.first_name || contact.last_name
                        ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                        : 'Unnamed Contact'}
                    </div>
                    {contact.email && (
                      <div className="text-sm text-gray-600">{contact.email}</div>
                    )}
                    {contact.phone && (
                      <div className="text-sm text-gray-600">
                        {contact.country_code || ''}{contact.phone}
                      </div>
                    )}
                    {contact.instruments && contact.instruments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {contact.instruments.map((inst) => (
                          <span
                            key={inst}
                            className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
                    )}
                    {contact.notes && (
                      <div className="mt-1 text-xs text-gray-500">{contact.notes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search and Add */}
      <div className="mb-6">
        <p className="mb-2 text-sm text-gray-900">
          Search for registered musicians to add them directly to the network:
        </p>
        <div className="flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchMusicians()}
            placeholder="Search by name or email..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
          <button
            onClick={searchMusicians}
            disabled={searching || !searchQuery.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 rounded-md border border-gray-200">
            {searchResults.map((musician) => (
              <div
                key={musician.id}
                className="flex items-center justify-between border-b border-gray-200 p-3 last:border-b-0"
              >
                <div>
                  <div className="font-medium text-gray-900">{musician.name}</div>
                  <div className="text-sm text-gray-600">{musician.email}</div>
                  {musician.instruments && musician.instruments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {musician.instruments.map((inst: string) => (
                        <span
                          key={inst}
                          className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => addToNetwork(musician.user_id)}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network Members List */}
      <div>
        <h4 className="mb-3 text-lg font-semibold text-gray-900">
          Network Members ({networkMembers.length})
        </h4>
        {networkMembers.length === 0 ? (
          <p className="text-gray-900">No musicians in venue network yet.</p>
        ) : (
          <div className="space-y-2">
            {networkMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border border-gray-200 p-3"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {member.musician?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {member.musician?.email || 'No email'}
                  </div>
                  {member.musician?.instruments &&
                    member.musician.instruments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {member.musician.instruments.map((inst) => (
                          <span
                            key={inst}
                            className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMessageMember(member)}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => removeFromNetwork(member.musician_id)}
                    className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Add Musician Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Add Musician to Network</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    instruments: [],
                  })
                  setCreatedInvitation(null)
                  setModalSearchQuery('')
                  setModalSearchResults([])
                  setShowInviteForm(false)
                  setError(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs for Add vs Invite */}
            <div className="mb-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => {
                    setShowInviteForm(false)
                    setModalSearchQuery('')
                    setModalSearchResults([])
                    setCreatedInvitation(null)
                  }}
                  className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                    !showInviteForm
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Add Registered Musician
                </button>
                <button
                  onClick={() => {
                    setShowInviteForm(true)
                    setModalSearchQuery('')
                    setModalSearchResults([])
                    setCreatedInvitation(null)
                  }}
                  className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                    showInviteForm
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Invite Unregistered Musician
                </button>
              </nav>
            </div>

            {/* Add Registered Musician Tab */}
            {!showInviteForm ? (
              <div>
                <p className="mb-4 text-sm text-gray-900">
                  Search for registered musicians to add them directly to the network:
                </p>
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchMusiciansInModal())}
                    placeholder="Search by name or email..."
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                  <button
                    onClick={searchMusiciansInModal}
                    disabled={modalSearching || !modalSearchQuery.trim()}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {modalSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {modalSearchResults.length > 0 && (
                  <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
                    {modalSearchResults.map((musician) => (
                      <div
                        key={musician.id}
                        className="flex items-center justify-between border-b border-gray-200 p-3 last:border-b-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{musician.name}</div>
                          <div className="text-sm text-gray-600">{musician.email}</div>
                          {musician.instruments && musician.instruments.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {musician.instruments.map((inst: string) => (
                                <span
                                  key={inst}
                                  className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                                >
                                  {inst}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            await addToNetwork(musician.user_id)
                            setModalSearchQuery('')
                            setModalSearchResults([])
                            setShowAddModal(false)
                          }}
                          className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {modalSearchQuery && modalSearchResults.length === 0 && !modalSearching && (
                  <p className="text-sm text-gray-500">No musicians found. Try a different search or invite an unregistered musician.</p>
                )}
              </div>
            ) : (
              <div>
                {/* Invite Unregistered Musician Tab */}
                {createdInvitation ? (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4">
                  <h4 className="text-lg font-semibold text-green-900 mb-2">Invitation Created Successfully!</h4>
                  <p className="text-sm text-green-800 mb-4">
                    Share this invitation URL with the musician so they can join the venue network.
                  </p>
                  <div className="space-y-2">
                    <div className="rounded-md bg-white border-2 border-green-500 px-4 py-3">
                      <div className="text-xs text-gray-500 mb-1">Invitation Code</div>
                      <div className="text-xl font-mono font-bold text-gray-900">{createdInvitation.invitation_code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-md bg-white border-2 border-green-500 px-4 py-3">
                        <div className="text-xs text-gray-500 mb-1">Invitation URL</div>
                        <div className="text-sm font-mono text-gray-900 break-all">{getInvitationUrl()}</div>
                      </div>
                      <button
                        onClick={copyInvitationCode}
                        className="rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 whitespace-nowrap"
                      >
                        Copy URL
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openWhatsAppShare}
                        className="flex-1 rounded-md bg-green-500 px-4 py-3 text-sm font-medium text-white hover:bg-green-600 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        Share via WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setCreatedInvitation(null)
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        instruments: [],
                      })
                    }}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={createInvitation} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Fill in any information you know about the musician. All fields are optional. An invitation code will be generated that you can share with them.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="musician@example.com"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-900">
                    Optional: WhatsApp number for messaging and gig coordination
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instruments (or Voice for singers)
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleInstrumentToggle('Voice')}
                      className={`mr-2 mb-2 rounded-full px-4 py-2 text-sm font-medium ${
                        formData.instruments.includes('Vocals' as Instrument)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      }`}
                    >
                      Voice
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {INSTRUMENTS.map((instrument) => (
                        <button
                          key={instrument}
                          type="button"
                          onClick={() => handleInstrumentToggle(instrument)}
                          disabled={formData.instruments.includes('Vocals' as Instrument)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            formData.instruments.includes(instrument)
                              ? 'bg-indigo-600 text-white'
                              : formData.instruments.includes('Vocals' as Instrument)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                          }`}
                        >
                          {instrument}
                        </button>
                      ))}
                    </div>
                    {formData.instruments.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Selected: {formData.instruments.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        instruments: [],
                      })
                      setError(null)
                    }}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {adding ? 'Creating Invitation...' : 'Create Invitation'}
                  </button>
                </div>
              </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Add Contact</h3>
              <button
                onClick={() => {
                  setShowAddContactModal(false)
                  setContactFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    countryCode: '',
                    instruments: [],
                    notes: '',
                  })
                  setError(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="contact-firstName"
                    value={contactFormData.firstName}
                    onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="contact-lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="contact-lastName"
                    value={contactFormData.lastName}
                    onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="contact-email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="musician@example.com"
                />
              </div>

              <div>
                <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700">
                  WhatsApp Number
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    id="contact-countryCode"
                    value={contactFormData.countryCode}
                    onChange={(e) => setContactFormData({ ...contactFormData, countryCode: e.target.value })}
                    className="w-32 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Code</option>
                    {COUNTRY_CODES.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.flag} {cc.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="contact-phone"
                    value={contactFormData.phone}
                    onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    placeholder="WhatsApp number"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-900">
                  WhatsApp number is required. Email is optional.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruments (or Voice for singers)
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const hasVocals = contactFormData.instruments.includes('Vocals' as Instrument)
                      setContactFormData({
                        ...contactFormData,
                        instruments: hasVocals ? [] : ['Vocals' as Instrument],
                      })
                    }}
                    className={`mr-2 mb-2 rounded-full px-4 py-2 text-sm font-medium ${
                      contactFormData.instruments.includes('Vocals' as Instrument)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    Voice
                  </button>
                  {INSTRUMENTS.filter(i => i !== 'Vocals').map((instrument) => (
                    <button
                      key={instrument}
                      type="button"
                      onClick={() => {
                        const currentInstruments = contactFormData.instruments.filter(i => i !== 'Vocals') as Instrument[]
                        if (currentInstruments.includes(instrument)) {
                          setContactFormData({
                            ...contactFormData,
                            instruments: currentInstruments.filter(i => i !== instrument),
                          })
                        } else {
                          setContactFormData({
                            ...contactFormData,
                            instruments: [...currentInstruments, instrument],
                          })
                        }
                      }}
                      className={`mr-2 mb-2 rounded-full px-4 py-2 text-sm font-medium ${
                        contactFormData.instruments.includes(instrument)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      }`}
                    >
                      {instrument}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="contact-notes" className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  id="contact-notes"
                  value={contactFormData.notes}
                  onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="Any additional notes about this contact..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddContactModal(false)
                    setContactFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      countryCode: '',
                      instruments: [],
                      notes: '',
                    })
                    setError(null)
                  }}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                  <button
                    type="submit"
                    disabled={addingContact || !contactFormData.phone}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {addingContact ? 'Adding...' : 'Add Contact'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageMember && (
        <MessageMusicianModal
          member={messageMember}
          isOpen={!!messageMember}
          onClose={() => setMessageMember(null)}
        />
      )}
    </div>
  )
}

