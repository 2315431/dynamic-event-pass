import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Star, Clock, Share2, Heart } from 'lucide-react'

const EventDetail = () => {
  const { id } = useParams()

  // Mock event data - in real app, fetch from API
  const event = {
    id: 1,
    title: "Tech Conference 2024",
    date: "2024-03-15",
    time: "09:00 AM",
    venue: "Convention Center",
    city: "San Francisco",
    price: "$99",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop",
    category: "Technology",
    rating: 4.8,
    attendees: 1200,
    description: "Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge innovations. This event brings together developers, designers, and tech enthusiasts from around the world to share knowledge, network, and discover the latest trends in technology.",
    organizer: "Tech Events Inc.",
    tags: ["Technology", "Innovation", "Networking", "AI", "Web Development"],
    schedule: [
      { time: "09:00 AM", title: "Registration & Welcome Coffee" },
      { time: "10:00 AM", title: "Keynote: Future of Technology" },
      { time: "11:00 AM", title: "Panel: AI in Business" },
      { time: "12:00 PM", title: "Lunch Break" },
      { time: "01:00 PM", title: "Workshop: Web Development" },
      { time: "02:00 PM", title: "Networking Session" },
      { time: "03:00 PM", title: "Closing Remarks" }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link to="/events" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
          ← Back to Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Image */}
            <div className="relative mb-6">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-64 md:h-80 object-cover rounded-lg"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {event.category}
                </span>
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                <button className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all">
                  <Heart className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Event Info */}
            <div className="card p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
              
              <div className="flex items-center space-x-6 mb-6">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{event.venue}, {event.city}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-2" />
                  <span>{event.attendees.toLocaleString()} attendees</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="ml-1 font-semibold">{event.rating}</span>
                </div>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">Organized by {event.organizer}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>

            {/* Schedule */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Schedule</h2>
              <div className="space-y-4">
                {event.schedule.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-20 text-sm font-medium text-gray-500">
                      {item.time}
                    </div>
                    <div className="flex-1 text-gray-900">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary-600 mb-2">{event.price}</div>
                <div className="text-sm text-gray-500">per ticket</div>
              </div>

              <Link
                to={`/booking/${event.id}`}
                className="w-full btn btn-primary btn-lg mb-4"
              >
                Book Now
              </Link>

              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Duration: 8 hours</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Capacity: {event.attendees.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Indoor event</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">What's Included</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Access to all sessions</li>
                  <li>• Lunch and refreshments</li>
                  <li>• Networking opportunities</li>
                  <li>• Digital event materials</li>
                  <li>• Certificate of attendance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventDetail