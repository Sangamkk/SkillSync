const Loader = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-950">
    <div className="text-center">
      <div className="relative mx-auto mb-5 w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-400 text-sm tracking-wide">{message}</p>
    </div>
  </div>
);

export default Loader;
