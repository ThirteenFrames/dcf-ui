import DCFModule from '../components/DCFModule';

const Index = () => {
  const handleValueChange = (price: number) => {
    console.log('Intrinsic value updated:', price);
  };

  return (
    <DCFModule 
      ticker="SAMPLE" 
      onValueChange={handleValueChange}
    />
  );
};

export default Index;
