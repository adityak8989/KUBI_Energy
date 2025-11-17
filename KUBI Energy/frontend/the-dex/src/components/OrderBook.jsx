import React from 'react';

function OrderBook({ title, data, type }) {
  const headerClasses = type === 'bids' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

  return (
    <div>
      <h3 className={`text-md font-semibold mb-2 p-2 rounded-t-md ${headerClasses}`}>
        {title}
      </h3>
      <table className="min-w-full bg-white border border-gray-200 rounded-b-md overflow-hidden">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Price/kWh</th>
            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Amount (ET)</th>
            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Source</th>
            <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b text-sm text-gray-800">${item.price}</td>
              <td className="py-2 px-4 border-b text-sm text-gray-800">{item.amount}</td>
              <td className="py-2 px-4 border-b text-sm text-gray-800">{item.source}</td>
              <td className="py-2 px-4 border-b text-sm text-gray-800">{item.time}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan="4" className="py-4 text-center text-gray-500 text-sm">No {title.toLowerCase()} available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default OrderBook;